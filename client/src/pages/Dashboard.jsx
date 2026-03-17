import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { Clock, AlertCircle, Calendar, Users, BarChart2 } from 'lucide-react'
import * as api from '../api'
import Badge from '../components/Badge'

const HISTORY_START = '2025-12-01'
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function normalizeShift(shiftName, eventId) {
  if (eventId) return 'Tournament'
  const onCourse = ['OCC', 'OCC Late', 'OCP', 'OCP Late']
  if (onCourse.includes(shiftName)) return 'On Course'
  return shiftName || 'Unknown'
}

export default function Dashboard() {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: schedule = [] } = useQuery({
    queryKey: ['schedule', todayStr, todayStr],
    queryFn: () => api.fetchSchedule(todayStr, todayStr),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['schedule', HISTORY_START, todayStr],
    queryFn: () => api.fetchSchedule(HISTORY_START, todayStr),
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: api.fetchEvents,
  })

  const { data: timeOff = [] } = useQuery({
    queryKey: ['timeoff'],
    queryFn: api.fetchTimeOff,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: api.fetchStaff,
  })

  const { data: weather = [] } = useQuery({
    queryKey: ['weather'],
    queryFn: api.fetchWeather,
  })

  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const todaySchedule = schedule.filter((assignment) => {
    const assignDate = new Date(assignment.date + 'T12:00:00')
    return isWithinInterval(assignDate, { start: todayStart, end: todayEnd })
  })

  const upcomingEvents = events
    .filter((event) => new Date(event.date + 'T12:00:00') >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  const pendingTimeOff = timeOff.filter((request) => request.status === 'pending')

  const nextWeekWeather = weather.filter((w) => {
    const wDate = new Date(w.date + 'T12:00:00')
    return wDate >= today && wDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  })

  // Shift Frequency — All Time
  const shiftStats = useMemo(() => {
    const counts = {}
    history.forEach((s) => {
      const label = normalizeShift(s.shift_name, s.event_id)
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [history])

  // Staff Patterns — All Time
  const staffPatterns = useMemo(() => {
    const patternMap = {}
    history.forEach((s) => {
      if (!s.staff_name) return
      const key = s.staff_name
      if (!patternMap[key]) {
        patternMap[key] = { name: key, role: s.staff_role, shiftCounts: {}, dayCounts: [0, 0, 0, 0, 0, 0, 0] }
      }
      const label = normalizeShift(s.shift_name, s.event_id)
      patternMap[key].shiftCounts[label] = (patternMap[key].shiftCounts[label] || 0) + 1
      const dayIdx = new Date(s.date + 'T12:00:00').getDay()
      patternMap[key].dayCounts[dayIdx]++
    })
    return Object.values(patternMap).map((p) => {
      const totalShifts = Object.values(p.shiftCounts).reduce((a, b) => a + b, 0)
      const topShift = Object.entries(p.shiftCounts).sort((a, b) => b[1] - a[1])[0]
      const offMin = Math.min(...p.dayCounts)
      const offDays = p.dayCounts.reduce((acc, count, i) => {
        if (count === offMin) acc.push(DAY_NAMES[i])
        return acc
      }, [])
      return {
        name: p.name,
        role: p.role,
        totalShifts,
        topShift: topShift ? topShift[0] : '—',
        offDays,
        offDayCount: offMin,
      }
    }).sort((a, b) => b.totalShifts - a.totalShifts)
  }, [history])

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Today</div>
          <div className="stat-value">{format(today, 'MMM dd, yyyy')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Staff</div>
          <div className="stat-value">{staff.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Shifts This Season</div>
          <div className="stat-value">{history.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Time Off</div>
          <div className="stat-value">{pendingTimeOff.length}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          <Clock className="inline" size={20} style={{ marginRight: '0.5rem' }} />
          Today's Schedule
        </h2>
        {todaySchedule.length === 0 ? (
          <p className="text-muted">No schedule for today</p>
        ) : (
          <div>
            {todaySchedule.map((assignment) => (
              <div key={assignment.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">{assignment.staff_name}</div>
                  <div className="list-item-subtitle">
                    {assignment.shift_name}
                    {assignment.start_time && ` • ${assignment.start_time}–${assignment.end_time}`}
                  </div>
                </div>
                <Badge type="role" value={assignment.staff_role} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">
          <Calendar className="inline" size={20} style={{ marginRight: '0.5rem' }} />
          Upcoming Events (Next 5)
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-muted">No upcoming events</p>
        ) : (
          <div>
            {upcomingEvents.map((event) => (
              <div key={event.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">{event.name}</div>
                  <div className="list-item-subtitle">
                    {format(new Date(event.date + 'T12:00:00'), 'MMM dd, yyyy')}
                    {event.time ? ` at ${event.time}` : ''}
                  </div>
                </div>
                <div className="flex-gap-1">
                  <Badge type="eventType" value={event.type} />
                  {event.extraStaffNeeded > 0 && (
                    <Badge type="default" value={`+${event.extraStaffNeeded} staff`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">
          <AlertCircle className="inline" size={20} style={{ marginRight: '0.5rem' }} />
          Pending Time Off Requests
        </h2>
        {pendingTimeOff.length === 0 ? (
          <p className="text-muted">No pending requests</p>
        ) : (
          <div>
            {pendingTimeOff.map((request) => (
              <div key={request.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">{request.staff_name || request.staffName}</div>
                  <div className="list-item-subtitle">
                    {format(new Date((request.start_date || request.startDate) + 'T12:00:00'), 'MMM dd')} –{' '}
                    {format(new Date((request.end_date || request.endDate) + 'T12:00:00'), 'MMM dd, yyyy')}
                  </div>
                </div>
                <Badge type="status" value={request.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {nextWeekWeather.length > 0 && (
        <div className="card">
          <h2 className="card-title">
            <AlertCircle className="inline" size={20} style={{ marginRight: '0.5rem' }} />
            Weather Alerts (Next 7 Days)
          </h2>
          <div>
            {nextWeekWeather.map((w) => (
              <div key={w.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">{format(new Date(w.date + 'T12:00:00'), 'MMM dd, yyyy')}</div>
                  <div className="list-item-subtitle">
                    {w.condition}{w.reduceStaff ? ' • Reduce staff' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shiftStats.length > 0 && (
        <div className="card">
          <h2 className="card-title">
            <BarChart2 className="inline" size={20} style={{ marginRight: '0.5rem' }} />
            Shift Frequency — All Time
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Shift</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Assignments</th>
              </tr>
            </thead>
            <tbody>
              {shiftStats.map(({ name, count }) => (
                <tr key={name}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>{name}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {staffPatterns.length > 0 && (
        <div className="card">
          <h2 className="card-title">
            <Users className="inline" size={20} style={{ marginRight: '0.5rem' }} />
            Staff Patterns — All Time
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {staffPatterns.map((p) => (
              <div key={p.name} style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{p.name}</div>
                <Badge type="role" value={p.role} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                  <div>Total shifts: <strong>{p.totalShifts}</strong></div>
                  <div>Most common: <strong>{p.topShift}</strong></div>
                  <div>Common day off: <strong>{p.offDays.join(' & ')} ×{p.offDayCount}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
