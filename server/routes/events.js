const express = require('express');
const router = express.Router();
const db = require('../db');

// GET events (optional date range filter)
router.get('/', (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT id, name, type, date, start_time, end_time, extra_staff_needed, notes, created_at FROM events';
    const params = [];
    const conditions = [];

    if (start) {
      conditions.push('date >= ?');
      params.push(start);
    }

    if (end) {
      conditions.push('date <= ?');
      params.push(end);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date, start_time';

    const stmt = db.prepare(query);
    const events = stmt.all(...params);

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create event
router.post('/', (req, res) => {
  try {
    const { name, type, date, start_time, end_time, extra_staff_needed, notes } = req.body;

    if (!name || !type || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Name, type, date, start_time, and end_time are required' });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO events (name, type, date, start_time, end_time, extra_staff_needed, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      type,
      date,
      start_time,
      end_time,
      extra_staff_needed || 0,
      notes || null,
      now
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      type,
      date,
      start_time,
      end_time,
      extra_staff_needed: extra_staff_needed || 0,
      notes: notes || null,
      created_at: now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update event
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, date, start_time, end_time, extra_staff_needed, notes } = req.body;

    // Check if event exists
    const checkStmt = db.prepare('SELECT id FROM events WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }
    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(end_time);
    }
    if (extra_staff_needed !== undefined) {
      updates.push('extra_staff_needed = ?');
      values.push(extra_staff_needed);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);

    const updated = db.prepare(`
      SELECT id, name, type, date, start_time, end_time, extra_staff_needed, notes, created_at
      FROM events
      WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE event
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const checkStmt = db.prepare('SELECT id FROM events WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const stmt = db.prepare('DELETE FROM events WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
