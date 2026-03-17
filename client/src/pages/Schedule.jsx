import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { Zap } from 'lucide-react'
import * as api from '../api'
import Modal from '../components/Modal'
import Badge from '../components/Badge'

export default function Schedule() {
  const [viewType, setViewType] = useState('week')
  const [startDate, setStartDate] = useState(startOfWeek(new Date()))
  const [editingCell, setEditingCell] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState('')

  const queryClient = useQueryClient()

  const endDate = viewType === 'week' ? addDays(startDate, 6) : endOfMonth(startDate)

  const { data: schedule = [] } = useQuery({
    queryKey: ['schedule', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: () => api.fetchSchedule(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')),
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: api.fetchStaff,
  })

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: api.fetchShifts,
  })

  const { data: weather = [] } = useQuery({
    queryKey: ['weather'],
    queryFn: api.fetchWeather,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: api.fetchEvents,
  })

  const generateMutation = useMutation({
    mutationFn: () => api.generateSchedule(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: api.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      setShowModal(false)
      setEditingCell(null)
      setSelectedStaff('')
    },
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: api.deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      setEditingCell(null)
    },
  })

  const getAssignmentForCell = (date, shiftId) => {
    return schedule.find(
      (a) =>
        format(new Date(a.date + 'T12:00:00'), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') &&
        (a.shift_template_id === shiftId || a.shift_id === shiftId)
    )
  }

  const handleCellClick = (date, shift) => {
    setEditingCell({ date, shift })
    const existing = getAssignmentForCell(date, shift.id)
    setSelectedStaff(existing ? String(existing.staff_id) : '')
    setShowModal(true)
  }

  const handleAssignStaff = () => {
    if (!selectedStaff || !editingCell) return
    createAssignmentMutation.mutate({
      date: format(editingCell.date, 'yyyy-MM-dd'),
      staff_id: parseInt(selectedStaff),
      shift_template_id: editingCell.shift.id,
    })
  }

  const handleRemoveAssignment = (assignmentId) => {
    deleteAssignmentMutation.mutate(assignmentId)
  }

  const handleClearWeek = () => {
    if (confirm('Remove all assignments for this period?')) {
      api.clearSchedule(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')).then(() => {
        queryClient.invalidateQueries({ queryKey: ['schedule'] })
      })
    }
  }

  const getWeatherForDate = (date) => {
    return weather.find((w) => format(new Date(w.date + 'T12:00:00'), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
  }

  const getEventsForDate = (date) => {
    return events.filter((e) => format(new Date(e.date + 'T12:00:00'), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
  }

  const renderWeekView = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i))
    }

    return (
      <table className="schedule-grid">
        <thead>
          <tr>
            <th>Shift</th>
            {days.map((day) => (
              <th key={format(day, 'yyyy-MM-dd')}>
                <div>{format(day, 'EEE')}</div>
                <div>{format(day, 'MMM dd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr key={shift.id}>
              <td>
                <strong>{shift.name}</strong>
                {shift.start_time && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{shift.start_time}–{shift.end_time}</div>
                )}
              </td>
              {days.map((day) => {
                const assignment = getAssignmentForCell(day, shift.id)
                const w = getWeatherForDate(day)
                return (
                  <td
                    key={`${format(day, 'yyyy-MM-dd')}-${shift.id}`}
                    onClick={() => handleCellClick(day, shift)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="schedule-cell">
                      <div className="schedule-cell-content">
                        {assignment && (
                          <div>
                            <div><strong>{assignment.staff_name}</strong></div>
                            <Badge type="role" value={assignment.staff_role} />
                          </div>
                        )}
                        {!assignment && <div style={{ color: '#9ca3af' }}>Unassigned</div>}
                        {w && <div style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>⚠️ {w.condition}</div>}
                      </div>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(startDate)
    const monthEnd = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const weeks = []
    let currentWeek = []

    const firstDayOfWeek = monthStart.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null)
    }

    days.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const defaultShift = shifts[0]

    return (
      <div>
        <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {dayLabels.map((label) => (
            <div key={label} style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {label}
            </div>
          ))}
          {weeks.flat().map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="calendar-day other-month"></div>
            }

            const dayAssignments = shifts.map((s) => getAssignmentForCell(day, s.id)).filter(Boolean)
            const w = getWeatherForDate(day)
            const dayEvents = getEventsForDate(day)

            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={`calendar-day ${isSameDay(day, new Date()) ? 'today' : ''}`}
                onClick={() => defaultShift && handleCellClick(day, defaultShift)}
              >
                <div className="calendar-day-number">{format(day, 'd')}</div>
                <div className="calendar-day-content">
                  {dayAssignments.length > 0 && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {dayAssignments.length} shifts
                    </div>
                  )}
                  {w && <div style={{ fontSize: '0.75rem' }}>⚠️</div>}
                  {dayEvents.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#059669' }}>📌</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1>Schedule</h1>
        <div className="flex-gap-1">
          <button className="btn btn-secondary btn-sm" onClick={() => setViewType('week')}>
            Week
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setViewType('month')}>
            Month
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div className="flex-gap-1">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setStartDate(addDays(startDate, viewType === 'week' ? -7 : -30))}
            >
              ← Previous
            </button>
            <span style={{ padding: '0.5rem 1rem', alignSelf: 'center' }}>
              {format(startDate, 'MMM yyyy')}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setStartDate(addDays(startDate, viewType === 'week' ? 7 : 30))}
            >
              Next →
            </button>
          </div>
          <div className="flex-gap-1">
            <button className="btn btn-secondary btn-sm" onClick={handleClearWeek}>
              Clear Period
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <Zap size={16} />
              {generateMutation.isPending ? 'Generating...' : 'Generate Schedule'}
            </button>
          </div>
        </div>

        {viewType === 'week' ? renderWeekView() : renderMonthView()}
      </div>

      <Modal
        isOpen={showModal}
        title={`${editingCell ? format(editingCell.date, 'MMM dd, yyyy') + ' — ' + editingCell.shift.name : ''}`}
        onClose={() => {
          setShowModal(false)
          setEditingCell(null)
          setSelectedStaff('')
        }}
        footer={
          <div className="flex-gap-1">
            {editingCell && selectedStaff && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  const assignment = getAssignmentForCell(editingCell.date, editingCell.shift.id)
                  if (assignment) handleRemoveAssignment(assignment.id)
                  setShowModal(false)
                  setEditingCell(null)
                  setSelectedStaff('')
                }}
              >
                Remove Assignment
              </button>
            )}
            <button className="btn btn-primary" onClick={handleAssignStaff} disabled={!selectedStaff}>
              Assign
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label>Select Staff Member</label>
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
            <option value="">-- Unassigned --</option>
            {staff.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  )
}
