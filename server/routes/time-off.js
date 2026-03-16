const express = require('express');
const router = express.Router();
const db = require('../db');

// GET time-off requests (optional filters)
router.get('/', (req, res) => {
  try {
    const { staffId, status } = req.query;
    let query = `
      SELECT
        tor.id,
        tor.staff_id,
        tor.start_date,
        tor.end_date,
        tor.reason,
        tor.status,
        tor.created_at,
        s.name as staff_name
      FROM time_off_requests tor
      LEFT JOIN staff s ON tor.staff_id = s.id
    `;
    const params = [];
    const conditions = [];

    if (staffId) {
      conditions.push('tor.staff_id = ?');
      params.push(staffId);
    }

    if (status) {
      conditions.push('tor.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY tor.start_date DESC';

    const stmt = db.prepare(query);
    const requests = stmt.all(...params);

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create time-off request
router.post('/', (req, res) => {
  try {
    const { staff_id, start_date, end_date, reason } = req.body;

    if (!staff_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'staff_id, start_date, and end_date are required' });
    }

    // Check if staff exists
    const checkStmt = db.prepare('SELECT id FROM staff WHERE id = ?');
    if (!checkStmt.get(staff_id)) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO time_off_requests (staff_id, start_date, end_date, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);

    const result = stmt.run(staff_id, start_date, end_date, reason || null, now);

    const getStmt = db.prepare(`
      SELECT
        tor.id,
        tor.staff_id,
        tor.start_date,
        tor.end_date,
        tor.reason,
        tor.status,
        tor.created_at,
        s.name as staff_name
      FROM time_off_requests tor
      LEFT JOIN staff s ON tor.staff_id = s.id
      WHERE tor.id = ?
    `);

    const request = getStmt.get(result.lastInsertRowid);

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update time-off request (approve/deny)
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, start_date, end_date } = req.body;

    // Check if request exists
    const checkStmt = db.prepare('SELECT id FROM time_off_requests WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Time-off request not found' });
    }

    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      values.push(reason);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(end_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE time_off_requests SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);

    const getStmt = db.prepare(`
      SELECT
        tor.id,
        tor.staff_id,
        tor.start_date,
        tor.end_date,
        tor.reason,
        tor.status,
        tor.created_at,
        s.name as staff_name
      FROM time_off_requests tor
      LEFT JOIN staff s ON tor.staff_id = s.id
      WHERE tor.id = ?
    `);

    const request = getStmt.get(id);

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE time-off request
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if request exists
    const checkStmt = db.prepare('SELECT id FROM time_off_requests WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Time-off request not found' });
    }

    const stmt = db.prepare('DELETE FROM time_off_requests WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Time-off request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
