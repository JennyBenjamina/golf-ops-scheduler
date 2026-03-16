const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all shift templates
router.get('/', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, start_time, end_time, role_type, description, requires_count
      FROM shift_templates
      ORDER BY name
    `);
    const shifts = stmt.all();

    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create shift template
router.post('/', (req, res) => {
  try {
    const { name, start_time, end_time, role_type, description, requires_count } = req.body;

    if (!name || !start_time || !end_time || !role_type) {
      return res.status(400).json({ error: 'Name, start_time, end_time, and role_type are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO shift_templates (name, start_time, end_time, role_type, description, requires_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      start_time,
      end_time,
      role_type,
      description || null,
      requires_count || 1
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      start_time,
      end_time,
      role_type,
      description: description || null,
      requires_count: requires_count || 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update shift template
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, role_type, description, requires_count } = req.body;

    // Check if shift exists
    const checkStmt = db.prepare('SELECT id FROM shift_templates WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Shift template not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(end_time);
    }
    if (role_type !== undefined) {
      updates.push('role_type = ?');
      values.push(role_type);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (requires_count !== undefined) {
      updates.push('requires_count = ?');
      values.push(requires_count);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE shift_templates SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);

    const updated = db.prepare(`
      SELECT id, name, start_time, end_time, role_type, description, requires_count
      FROM shift_templates
      WHERE id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE shift template
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift exists
    const checkStmt = db.prepare('SELECT id FROM shift_templates WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Shift template not found' });
    }

    const stmt = db.prepare('DELETE FROM shift_templates WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Shift template deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
