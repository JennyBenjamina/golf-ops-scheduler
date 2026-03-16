require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'golf-ops';

let _client = null;
let _db = null;

async function getDb() {
  if (_db) return _db;
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set');
  _client = new MongoClient(MONGODB_URI);
  await _client.connect();
  _db = _client.db(DB_NAME);
  return _db;
}

function strip(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

async function nextId(table) {
  const db = await getDb();
  const result = await db.collection('_counters').findOneAndUpdate(
    { _id: table },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

async function getAll(table, filterFn) {
  const db = await getDb();
  const docs = await db.collection(table).find({}, { projection: { _id: 0 } }).toArray();
  if (filterFn) return docs.filter(filterFn);
  return docs;
}

async function getById(table, id) {
  const db = await getDb();
  const doc = await db.collection(table).findOne({ id }, { projection: { _id: 0 } });
  return doc || null;
}

async function create(table, record) {
  const db = await getDb();
  const id = await nextId(table);
  const newRecord = { id, ...record };
  await db.collection(table).insertOne(newRecord);
  return strip(newRecord);
}

async function update(table, id, updates) {
  const db = await getDb();
  const result = await db.collection(table).findOneAndUpdate(
    { id },
    { $set: updates },
    { returnDocument: 'after', projection: { _id: 0 } }
  );
  return result || null;
}

async function remove(table, id) {
  const db = await getDb();
  const result = await db.collection(table).deleteOne({ id });
  return result.deletedCount > 0;
}

async function upsert(table, matchFn, record) {
  const docs = await getAll(table);
  const existing = docs.find(matchFn);
  if (existing) {
    return await update(table, existing.id, record);
  }
  return await create(table, record);
}

module.exports = { getAll, getById, create, update, remove, upsert, getDb };
