/**
 * One-time migration script: imports data.json into MongoDB Atlas.
 *
 * Usage:
 *   1. Create a .env file with MONGODB_URI set (see .env.example)
 *   2. npm run seed
 *
 * Safe to re-run — it clears and re-inserts each collection every time.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB || 'golf-ops';
  const dataPath = path.join(__dirname, 'data.json');

  if (!fs.existsSync(dataPath)) {
    console.error('Error: server/data.json not found.');
    process.exit(1);
  }

  const { data, nextIds } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`Connected to MongoDB — seeding database "${dbName}"`);
    const db = client.db(dbName);

    // Seed each collection
    for (const [collection, records] of Object.entries(data)) {
      await db.collection(collection).deleteMany({});
      if (records.length > 0) {
        await db.collection(collection).insertMany(records);
      }
      console.log(`  ${collection}: ${records.length} records`);
    }

    // Seed auto-increment counters
    // nextIds[table] is the NEXT id to assign, so we store nextIds[table] - 1
    // so the first $inc returns nextIds[table]
    await db.collection('_counters').deleteMany({});
    const counterDocs = Object.entries(nextIds).map(([table, nextId]) => ({
      _id: table,
      seq: nextId - 1,
    }));
    await db.collection('_counters').insertMany(counterDocs);
    console.log('  _counters: seeded');

    console.log('\nMigration complete!');
  } finally {
    await client.close();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
