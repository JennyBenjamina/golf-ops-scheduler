import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { Clock, AlertCircle, Calendar, Users } from 'lucide-react'
import * as api from '../api'
import Badge from '../components/Badge'

export default function Dashboard() {
  const { data: schedule = [] } = useQuery({
    queryKey: ['schedule'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      return api.fetchSchedule(today, today)
    },
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

  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  const todaySchedule = schedule.filter((assignment) => {
    const assignDate = new Date(assignment.date)
    return isWithinInterval(assignDate, { start: todayStart, end: todayEnd })
  })

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  const pendingTimeOff = timeOff.filter((request) => request.status === 'pending')

  const nextWeekWeather = weather
    .filter((w) => {
      const wDate = new Date(w.date)
      return wDate >= today && wDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    })

  const totalStaff = staff.length

  const scheduledHours = schedule
    .filter((assignment) => {
      const assignDate = new Date(assignment.date)
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return isWithinInterval(assignDate, { start: weekStart, end: weekEnd })
    })
    .reduce((total, assignment) => {
      return total + (assignment.hours || 8)
    }, 0)

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
          <div className="stat-value">{totalStaff}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week Hours</div>
          <div className="stat-value">{scheduledHours}</div>
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
                  <div className="list-item-title">{assignment.staffName}</div>
                  <div className="list-item-subtitle">
                    {assignment.shiftTemplate} • {assignment.hours || 8} hours
                  </div>
                </div>
                <Badge type="role" value={assignment.staffRole} />
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
                    {format(new Date(event.date), 'MMM dd, yyyy')} at {event.time}
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
                  <div className="list-item-title">{request.staffName}</div>
                  <div className="list-item-subtitle">
                    {format(new Date(request.startDate), 'MMM dd')} -{' '}
                    {format(new Date(request.endDate), 'MMM dd, yyyy')}
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
                  <div className="list-item-title">{format(new Date(w.date), 'MMM dd, yyyy')}</div>
                  <div className="list-item-subtitle">
                    {w.condition} {w.reduceStaff && '• Reduce staff'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
