const express = require('express');
const router = express.Router();
const db = require('../db');

// GET weather flags (optional date range filter)
router.get('/', (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT id, date, condition, reduce_staff, notes FROM weather_flags';
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

    query += ' ORDER BY date';

    const stmt = db.prepare(query);
    const flags = stmt.all(...params);

    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create/update weather flag (upsert by date)
router.post('/', (req, res) => {
  try {
    const { date, condition, reduce_staff, notes } = req.body;

    if (!date || !condition) {
      return res.status(400).json({ error: 'date and condition are required' });
    }

    // Check if flag exists for this date
    const existingStmt = db.prepare('SELECT id FROM weather_flags WHERE date = ?');
    const existing = existingStmt.get(date);

    let result;

    if (existing) {
      // Update existing
      const updateStmt = db.prepare(`
        UPDATE weather_flags
        SET condition = ?, reduce_staff = ?, notes = ?
        WHERE date = ?
      `);
      updateStmt.run(condition, reduce_staff || 0, notes || null, date);
      result = existing.id;
    } else {
      // Insert new
      const insertStmt = db.prepare(`
        INSERT INTO weather_flags (date, condition, reduce_staff, notes)
        VALUES (?, ?, ?, ?)
      `);
      const insertResult = insertStmt.run(date, condition, reduce_staff || 0, notes || null);
      result = insertResult.lastInsertRowid;
    }

    const getStmt = db.prepare(`
      SELECT id, date, condition, reduce_staff, notes
      FROM weather_flags
      WHERE id = ?
    `);

    const flag = getStmt.get(result);

    res.status(existing ? 200 : 201).json(flag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE weather flag
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if flag exists
    const checkStmt = db.prepare('SELECT id FROM weather_flags WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Weather flag not found' });
    }

    const stmt = db.prepare('DELETE FROM weather_flags WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Weather flag deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
