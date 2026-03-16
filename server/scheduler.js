const db = require('./db');

function getWeekNumber(dateStr) {
  const date = new Date(dateStr);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function getShiftHours(shift) {
  const [startHour, startMin] = shift.start_time.split(':').map(Number);
  const [endHour, endMin] = shift.end_time.split(':').map(Number);

  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  if (endMinutes <= startMinutes) endMinutes += 24 * 60;

  return (endMinutes - startMinutes) / 60;
}

function dateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stringToDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

async function generateSchedule(startDate, endDate) {
  const start = typeof startDate === 'string' ? stringToDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? stringToDate(endDate) : endDate;

  const isActive = s => s.status === 'active' || (s.status === undefined && s.active !== false);

  // Fetch all data upfront
  const [
    allStaff,
    allShiftTemplates,
    allEvents,
    allPreferences,
    allTimeOff,
    weatherFlags,
    existingSchedules,
  ] = await Promise.all([
    db.getAll('staff'),
    db.getAll('shift_templates'),
    db.getAll('events'),
    db.getAll('staff_preferences'),
    db.getAll('time_off_requests', t => t.status === 'approved'),
    db.getAll('weather_flags'),
    db.getAll('schedules'),
  ]);

  const assistantPros = allStaff.filter(s => s.role === 'assistant_pro' && isActive(s));
  const leadershipStaff = allStaff.filter(s =>
    (s.role === 'head_pro' || s.role === 'director_of_golf' || s.role === 'caddy_master') && isActive(s)
  );
  const assistantProShifts = allShiftTemplates.filter(st => st.role_type === 'assistant_pro');
  const leadershipShifts = allShiftTemplates.filter(st => st.role_type === 'leadership');

  // Cache shift templates for fast lookup
  const shiftTemplateMap = new Map(allShiftTemplates.map(st => [st.id, st]));

  // Clear existing schedules in the date range
  for (const sched of existingSchedules) {
    const schedDate = stringToDate(sched.date);
    if (schedDate >= start && schedDate <= end) {
      await db.remove('schedules', sched.id);
    }
  }

  const createdSchedules = [];

  let currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = dateToString(currentDate);
    const dayOfWeek = currentDate.getDay();
    const weekNum = getWeekNumber(dateStr);

    const weatherFlag = weatherFlags.find(w => w.date === dateStr);
    const reduceStaff = weatherFlag && weatherFlag.reduce_staff;

    const dayEvents = allEvents.filter(e => e.date === dateStr);

    const shiftsNeeded = [];

    if (reduceStaff) {
      shiftsNeeded.push(
        { template: assistantProShifts.find(s => s.name === 'Starter'), eventId: null },
        { template: assistantProShifts.find(s => s.name === 'OCC'), eventId: null }
      );
    } else {
      assistantProShifts.forEach(s => shiftsNeeded.push({ template: s, eventId: null }));
      dayEvents.forEach(event => {
        if (event.extra_staff_needed > 0) {
          const occ = assistantProShifts.find(s => s.name === 'OCC');
          if (occ) shiftsNeeded.push({ template: occ, eventId: event.id });
        }
      });
    }

    const assignedToday = new Set();

    for (const shiftNeeded of shiftsNeeded) {
      const shift = shiftNeeded.template;
      if (!shift) continue;

      const shiftHours = getShiftHours(shift);
      let bestStaff = null;
      let bestScore = -Infinity;

      for (const staff of assistantPros) {
        if (assignedToday.has(staff.id)) continue;

        const isTimeOff = allTimeOff.some(t =>
          t.staff_id === staff.id &&
          t.start_date <= dateStr &&
          t.end_date >= dateStr
        );
        if (isTimeOff) continue;

        const weeklyAssignments = createdSchedules.filter(s =>
          s.staff_id === staff.id && getWeekNumber(s.date) === weekNum
        );

        const uniqueDays = new Set(weeklyAssignments.map(s => s.date)).size;
        if (uniqueDays >= 5) continue;

        let currentHours = 0;
        for (const wa of weeklyAssignments) {
          const template = shiftTemplateMap.get(wa.shift_template_id);
          if (template) currentHours += getShiftHours(template);
        }

        if (currentHours + shiftHours > staff.max_hours_per_week) continue;

        let score = 0;

        const preference = allPreferences.find(p =>
          p.staff_id === staff.id &&
          p.shift_template_id === shift.id &&
          p.day_of_week === dayOfWeek
        );
        if (preference) score += preference.preference_level || 3;

        if (weeklyAssignments.length < 3) score += 3;

        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = dateToString(yesterday);
        const workedYesterday = createdSchedules.some(s =>
          s.staff_id === staff.id &&
          s.date === yesterdayStr &&
          s.shift_template_id === shift.id
        );
        if (workedYesterday) score -= 5;

        score += Math.random();

        if (score > bestScore) {
          bestScore = score;
          bestStaff = staff;
        }
      }

      if (bestStaff) {
        const schedule = await db.create('schedules', {
          staff_id: bestStaff.id,
          date: dateStr,
          shift_template_id: shift.id,
          event_id: shiftNeeded.eventId || null,
          status: 'scheduled',
        });
        createdSchedules.push(schedule);
        assignedToday.add(bestStaff.id);
      }
    }

    // Leadership rotation
    const starterShift = leadershipShifts.find(s => s.name === 'Starter');
    if (starterShift && leadershipStaff.length > 0) {
      const dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / 86400000);
      const leadershipIndex = dayOfYear % leadershipStaff.length;
      await db.create('schedules', {
        staff_id: leadershipStaff[leadershipIndex].id,
        date: dateStr,
        shift_template_id: starterShift.id,
        event_id: null,
        status: 'scheduled',
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return createdSchedules;
}

module.exports = { generateSchedule };
