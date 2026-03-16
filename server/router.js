const express = require('express');
const router = express.Router();
const db = require('./db');
const { generateSchedule } = require('./scheduler');

// Helper: enrich a schedule entry with staff, shift, and event data (in-memory join)
function enrichSchedules(schedules, staffMap, shiftMap, eventMap) {
  return schedules.map(s => {
    const staffId = typeof s.staff_id === 'string' ? parseInt(s.staff_id) : s.staff_id;
    const shiftTemplateId = s.shift_template_id || s.shift_id;
    const staff = staffMap.get(staffId) || null;
    const shift = shiftMap.get(shiftTemplateId) || null;
    const event = s.event_id ? (eventMap.get(s.event_id) || null) : null;
    return {
      ...s,
      shift_id: shiftTemplateId,
      staff_name: staff ? staff.name : null,
      staff_role: staff ? staff.role : null,
      shift_name: shift ? shift.name : null,
      start_time: shift ? shift.start_time : null,
      end_time: shift ? shift.end_time : null,
      staff: staff || null,
      shift: shift || null,
      event: event || null,
    };
  });
}

// ── Staff ─────────────────────────────────────────────────────────────────────

router.get('/staff', async (req, res) => {
  try {
    let staff = await db.getAll('staff');
    if (req.query.role) staff = staff.filter(s => s.role === req.query.role);
    res.json(staff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/staff/:id', async (req, res) => {
  try {
    const staff = await db.getById('staff', parseInt(req.params.id));
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/staff', async (req, res) => {
  try {
    const staff = await db.create('staff', req.body);
    res.status(201).json(staff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/staff/:id', async (req, res) => {
  try {
    const staff = await db.update('staff', parseInt(req.params.id), req.body);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json(staff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    const staff = await db.getById('staff', parseInt(req.params.id));
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    await db.update('staff', parseInt(req.params.id), { active: false });
    res.json({ message: 'Staff deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Shift Templates ───────────────────────────────────────────────────────────

router.get('/shifts', async (req, res) => {
  try {
    res.json(await db.getAll('shift_templates'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/shifts/:id', async (req, res) => {
  try {
    const shift = await db.getById('shift_templates', parseInt(req.params.id));
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json(shift);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/shifts', async (req, res) => {
  try {
    res.status(201).json(await db.create('shift_templates', req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/shifts/:id', async (req, res) => {
  try {
    const shift = await db.update('shift_templates', parseInt(req.params.id), req.body);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    res.json(shift);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/shifts/:id', async (req, res) => {
  try {
    const removed = await db.remove('shift_templates', parseInt(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Shift not found' });
    res.json({ message: 'Shift deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Events ────────────────────────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  try {
    let events = await db.getAll('events');
    if (req.query.start && req.query.end) {
      events = events.filter(e => e.date >= req.query.start && e.date <= req.query.end);
    }
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/events/:id', async (req, res) => {
  try {
    const event = await db.getById('events', parseInt(req.params.id));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/events', async (req, res) => {
  try {
    res.status(201).json(await db.create('events', req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/events/:id', async (req, res) => {
  try {
    const event = await db.update('events', parseInt(req.params.id), req.body);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const removed = await db.remove('events', parseInt(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Preferences ───────────────────────────────────────────────────────────────

router.get('/preferences/:staffId', async (req, res) => {
  try {
    const staffId = parseInt(req.params.staffId);
    res.json(await db.getAll('staff_preferences', p => p.staff_id === staffId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/preferences', async (req, res) => {
  try {
    const data = req.body;
    const pref = await db.upsert(
      'staff_preferences',
      p => p.staff_id === data.staff_id && p.shift_template_id === data.shift_template_id && p.day_of_week === data.day_of_week,
      data
    );
    res.status(201).json(pref);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/preferences/:id', async (req, res) => {
  try {
    const removed = await db.remove('staff_preferences', parseInt(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Preference not found' });
    res.json({ message: 'Preference deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Time Off ──────────────────────────────────────────────────────────────────

router.get('/time-off', async (req, res) => {
  try {
    let timeOff = await db.getAll('time_off_requests');
    if (req.query.staffId) timeOff = timeOff.filter(t => t.staff_id === parseInt(req.query.staffId));
    if (req.query.status) timeOff = timeOff.filter(t => t.status === req.query.status);
    res.json(timeOff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/time-off', async (req, res) => {
  try {
    res.status(201).json(await db.create('time_off_requests', req.body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/time-off/:id', async (req, res) => {
  try {
    const timeOff = await db.update('time_off_requests', parseInt(req.params.id), req.body);
    if (!timeOff) return res.status(404).json({ error: 'Time off request not found' });
    res.json(timeOff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/time-off/:id', async (req, res) => {
  try {
    const removed = await db.remove('time_off_requests', parseInt(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Time off request not found' });
    res.json({ message: 'Time off request deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Schedule ──────────────────────────────────────────────────────────────────

router.get('/schedule', async (req, res) => {
  try {
    let schedules = await db.getAll('schedules');
    if (req.query.start && req.query.end) {
      schedules = schedules.filter(s => s.date >= req.query.start && s.date <= req.query.end);
    }
    const [allStaff, allShifts, allEvents] = await Promise.all([
      db.getAll('staff'),
      db.getAll('shift_templates'),
      db.getAll('events'),
    ]);
    const staffMap = new Map(allStaff.map(s => [s.id, s]));
    const shiftMap = new Map(allShifts.map(s => [s.id, s]));
    const eventMap = new Map(allEvents.map(e => [e.id, e]));
    res.json(enrichSchedules(schedules, staffMap, shiftMap, eventMap));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/schedule', async (req, res) => {
  try {
    const data = req.body;
    const normalized = {
      ...data,
      shift_template_id: data.shift_template_id || (data.shift_id ? parseInt(data.shift_id) : undefined),
      staff_id: data.staff_id ? parseInt(data.staff_id) : data.staff_id,
    };
    delete normalized.shift_id;
    const schedule = await db.create('schedules', normalized);
    const [staff, shift, event] = await Promise.all([
      db.getById('staff', schedule.staff_id),
      db.getById('shift_templates', schedule.shift_template_id),
      schedule.event_id ? db.getById('events', schedule.event_id) : Promise.resolve(null),
    ]);
    res.status(201).json({
      ...schedule,
      shift_id: schedule.shift_template_id,
      staff_name: staff ? staff.name : null,
      staff_role: staff ? staff.role : null,
      shift_name: shift ? shift.name : null,
      start_time: shift ? shift.start_time : null,
      end_time: shift ? shift.end_time : null,
      staff: staff || null,
      shift: shift || null,
      event: event || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/schedule/:id', async (req, res) => {
  try {
    const schedule = await db.getById('schedules', parseInt(req.params.id));
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    const [staff, shift, event] = await Promise.all([
      db.getById('staff', schedule.staff_id),
      db.getById('shift_templates', schedule.shift_template_id),
      schedule.event_id ? db.getById('events', schedule.event_id) : Promise.resolve(null),
    ]);
    res.json({ ...schedule, staff: staff || null, shift: shift || null, event: event || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/schedule/:id', async (req, res) => {
  try {
    const schedule = await db.update('schedules', parseInt(req.params.id), req.body);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    const [staff, shift, event] = await Promise.all([
      db.getById('staff', schedule.staff_id),
      db.getById('shift_templates', schedule.shift_template_id),
      schedule.event_id ? db.getById('events', schedule.event_id) : Promise.resolve(null),
    ]);
    res.json({ ...schedule, staff: staff || null, shift: shift || null, event: event || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/schedule/:id', async (req, res) => {
  try {
    const removed = await db.remove('schedules', parseInt(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ message: 'Schedule deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/schedule/generate', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Missing startDate or endDate' });
    const schedules = await generateSchedule(startDate, endDate);
    res.status(201).json(schedules);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/schedule/clear', async (req, res) => {
  try {
    const { startDate, endDate, start_date, end_date } = req.body;
    const start = startDate || start_date;
    const end = endDate || end_date;
    if (!start || !end) return res.status(400).json({ error: 'Missing startDate or endDate' });
    const toDelete = await db.getAll('schedules', s => s.date >= start && s.date <= end);
    for (const s of toDelete) await db.remove('schedules', s.id);
    res.json({ message: `Cleared ${toDelete.length} assignments`, count: toDelete.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Weather ───────────────────────────────────────────────────────────────────

router.get('/weather', async (req, res) => {
  try {
    let weather = await db.getAll('weather_flags');
    if (req.query.start && req.query.end) {
      weather = weather.filter(w => w.date >= req.query.start && w.date <= req.query.end);
    }
    res.json(weather);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/weather', async (req, res) => {
  try {
    const weather = await db.upsert('weather_flags', w => w.date === req.body.date, req.body);
    res.status(201).json(weather);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/weather/:id', async (req, res) => {
  try {
    const removed = await db.remove('weather_flags', parseInt(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Weather flag not found' });
    res.json({ message: 'Weather flag deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
