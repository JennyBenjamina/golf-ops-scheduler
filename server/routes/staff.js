const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all active staff (optional role filter)
router.get('/', (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, name, role, email, phone, max_hours_per_week, active, created_at FROM staff WHERE active = 1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY name';

    const stmt = db.prepare(query);
    const staff = stmt.all(...params);

    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one staff member
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT id, name, role, email, phone, max_hours_per_week, active, created_at
      FROM staff
      WHERE id = ?
    `);
    const staff = stmt.get(id);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create staff member
router.post('/', (req, res) => {
  try {
    const { name, role, email, phone, max_hours_per_week } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO staff (name, role, email, phone, max_hours_per_week, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);

    const result = stmt.run(name, role, email || null, phone || null, max_hours_per_week || 40, now);

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      role,
      email: email || null,
      phone: phone || null,
      max_hours_per_week: max_hours_per_week || 40,
      active: 1,
      created_at: now
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update staff member
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, email, phone, max_hours_per_week, active } = req.body;

    // Check if staff exists
    const checkStmt = db.prepare('SELECT id FROM staff WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (max_hours_per_week !== undefined) {
      updates.push('max_hours_per_week = ?');
      values.push(max_hours_per_week);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE staff SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);

    const updated = db.prepare(`
      SELECT id, name, role, email, phone, max_hours_per_week, active, created_at
      FROM staff
      WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE soft delete (set active=0)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if staff exists
    const checkStmt = db.prepare('SELECT id FROM staff WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const stmt = db.prepare('UPDATE staff SET active = 0 WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Staff member deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
