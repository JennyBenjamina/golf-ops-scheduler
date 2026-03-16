const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateSchedule } = require('../scheduler');

// GET schedule with date range filter (required)
router.get('/', (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end date parameters are required' });
    }

    const stmt = db.prepare(`
      SELECT
        s.id,
        s.staff_id,
        s.date,
        s.shift_template_id,
        s.event_id,
        s.status,
        s.notes,
        s.created_at,
        st.name as staff_name,
        sh.name as shift_name,
        sh.start_time,
        sh.end_time,
        e.name as event_name
      FROM schedules s
      LEFT JOIN staff st ON s.staff_id = st.id
      LEFT JOIN shift_templates sh ON s.shift_template_id = sh.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.date >= ? AND s.date <= ? AND s.status != 'cancelled'
      ORDER BY s.date, sh.start_time, st.name
    `);

    const schedule = stmt.all(start, end);

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create single assignment
router.post('/', (req, res) => {
  try {
    const { staff_id, date, shift_template_id, event_id, status, notes } = req.body;

    if (!staff_id || !date || !shift_template_id) {
      return res.status(400).json({ error: 'staff_id, date, and shift_template_id are required' });
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

    // Check if event exists (if provided)
    if (event_id) {
      const checkEventStmt = db.prepare('SELECT id FROM events WHERE id = ?');
      if (!checkEventStmt.get(event_id)) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO schedules (staff_id, date, shift_template_id, event_id, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      staff_id,
      date,
      shift_template_id,
      event_id || null,
      status || 'scheduled',
      notes || null,
      now
    );

    const getStmt = db.prepare(`
      SELECT
        s.id,
        s.staff_id,
        s.date,
        s.shift_template_id,
        s.event_id,
        s.status,
        s.notes,
        s.created_at,
        st.name as staff_name,
        sh.name as shift_name,
        sh.start_time,
        sh.end_time,
        e.name as event_name
      FROM schedules s
      LEFT JOIN staff st ON s.staff_id = st.id
      LEFT JOIN shift_templates sh ON s.shift_template_id = sh.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.id = ?
    `);

    const assignment = getStmt.get(result.lastInsertRowid);

    res.status(201).json(assignment);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Staff member is already scheduled for this shift on this date' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update assignment
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, date, shift_template_id, event_id, status, notes } = req.body;

    // Check if assignment exists
    const checkStmt = db.prepare('SELECT id FROM schedules WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Schedule assignment not found' });
    }

    const updates = [];
    const values = [];

    if (staff_id !== undefined) {
      // Check if staff exists
      const checkStaffStmt = db.prepare('SELECT id FROM staff WHERE id = ?');
      if (!checkStaffStmt.get(staff_id)) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      updates.push('staff_id = ?');
      values.push(staff_id);
    }

    if (date !== undefined) {
      updates.push('date = ?');
      values.push(date);
    }

    if (shift_template_id !== undefined) {
      // Check if shift exists
      const checkShiftStmt = db.prepare('SELECT id FROM shift_templates WHERE id = ?');
      if (!checkShiftStmt.get(shift_template_id)) {
        return res.status(404).json({ error: 'Shift template not found' });
      }
      updates.push('shift_template_id = ?');
      values.push(shift_template_id);
    }

    if (event_id !== undefined) {
      if (event_id) {
        const checkEventStmt = db.prepare('SELECT id FROM events WHERE id = ?');
        if (!checkEventStmt.get(event_id)) {
          return res.status(404).json({ error: 'Event not found' });
        }
      }
      updates.push('event_id = ?');
      values.push(event_id || null);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);

    const getStmt = db.prepare(`
      SELECT
        s.id,
        s.staff_id,
        s.date,
        s.shift_template_id,
        s.event_id,
        s.status,
        s.notes,
        s.created_at,
        st.name as staff_name,
        sh.name as shift_name,
        sh.start_time,
        sh.end_time,
        e.name as event_name
      FROM schedules s
      LEFT JOIN staff st ON s.staff_id = st.id
      LEFT JOIN shift_templates sh ON s.shift_template_id = sh.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.id = ?
    `);

    const assignment = getStmt.get(id);

    res.json(assignment);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Staff member is already scheduled for this shift on this date' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE assignment
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Check if assignment exists
    const checkStmt = db.prepare('SELECT id FROM schedules WHERE id = ?');
    if (!checkStmt.get(id)) {
      return res.status(404).json({ error: 'Schedule assignment not found' });
    }

    const stmt = db.prepare('DELETE FROM schedules WHERE id = ?');
    stmt.run(id);

    res.json({ message: 'Schedule assignment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST auto-generate schedule
router.post('/generate', (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const assignments = generateSchedule(startDate, endDate);

    res.status(201).json({
      message: 'Schedule generated successfully',
      count: assignments.length,
      assignments: assignments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
