const express = require('express');
const router = express.Router();
const db = require('../db');

// GET preferences for a staff member
router.get('/:staffId', (req, res) => {
  try {
    const { staffId } = req.params;

    // Check if staff exists
    const checkStmt = db.prepare('SELECT id FROM staff WHERE id = ?');
    if (!checkStmt.get(staffId)) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const stmt = db.prepare(`
      SELECT
        sp.id,
        sp.staff_id,
        sp.day_of_week,
        sp.shift_template_id,
        sp.preference_level,
        sp.notes,
        sp.created_at,
        st.name as shift_name
      FROM staff_preferences sp
      LEFT JOIN shift_templates st ON sp.shift_template_id = st.id
      WHERE sp.staff_id = ?
      ORDER BY sp.day_of_week, sp.shift_template_id
    `);

    const preferences = stmt.all(staffId);

    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create/update preference (upsert)
router.post('/', (req, res) => {
  try {
    const { staff_id, day_of_week, shift_template_id, preference_level, notes } = req.body;

    if (staff_id === undefined || day_of_week === undefined || shift_template_id === undefined || preference_level === undefined) {
      return res.status(400).json({ error: 'staff_id, day_of_week, shift_template_id, and preference_level are required' });
    }

    // Check if staff exists
    const checkStaffStmt = db.prepare('SELECT id FROM staff WHERE id = ?');
    if (!checkStaffStmt.get(staff_id)) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Check if shift exists
    const checkShiftStmt = db.prepare('SELECT id FROM shift_templates WHERE id = ?');
    if (!checkShiftStmt.get(shift_template_id)) {
      return res.status(404).json({ error: 'Shift template not found' });
    }

    // Check if preference exists
    const existingStmt = db.prepare(`
      SELECT id FROM staff_preferences
      WHERE staff_id = ? AND day_of_week = ? AND shift_template_id = ?
    `);
    const existing = existingStmt.get(staff_id, day_of_week, shift_template_id);

    let result;
    const now = new Date().toISOString();

    if (existing) {
      // Update existing
      const updateStmt = db.prepare(`
        UPDATE staff_preferences
        SET preference_level = ?, notes = ?
        WHERE id = ?
      `);
      updateStmt.run(preference_level, notes || null, existing.id);
      result = existing;
    } else {
      // Insert new
      const insertStmt = db.prepare(`
        INSERT INTO staff_preferences (staff_id, day_of_week, shift_template_id, preference_level, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertResult = insertStmt.run(staff_id, day_of_week, shift_template_id, preference_level, notes || null, now);
      result = insertResult.lastInsertRowid;
    }

    const getStmt = db.prepare(`
      SELECT
        sp.id,
        sp.staff_id,
        sp.day_of_week,
        sp.shift_template_id,
        sp.preference_level,
        sp.notes,
        sp.created_at,
        st.name as shift_name
      FROM staff_preferences sp
      LEFT JOIN shift_templates st ON sp.shift_template_id = st.id
      WHERE sp.id = ?
    `);

    const preference = getStmt.get(existing ? existing.id : result);

    res.status(existing ? 200 : 201).json(preference);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Preference already exists for this staff member, day, and shift' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE preference
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if preference exists
    const checkStmt = db.prepare('SELECT id FROM staff_preferences WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    const stmt = db.prepare('DELETE FROM staff_preferences WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Preference deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
