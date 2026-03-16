import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Edit, Trash2 } from 'lucide-react'
import * as api from '../api'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { EVENT_TYPES } from '../constants'

export default function Events() {
  const [showModal, setShowModal] = useState(false)
  const [viewType, setViewType] = useState('list')
  const [editingEvent, setEditingEvent] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    date: '',
    time: '',
    extraStaffNeeded: 0,
    notes: '',
  })

  const queryClient = useQueryClient()

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: api.fetchEvents,
  })

  const createMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      resetForm()
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateEvent(editingEvent.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      resetForm()
      setShowModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      date: '',
      time: '',
      extraStaffNeeded: 0,
      notes: '',
    })
    setEditingEvent(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (event) => {
    setEditingEvent(event)
    setFormData({
      name: event.name,
      type: event.type,
      date: event.date,
      time: event.time,
      extraStaffNeeded: event.extraStaffNeeded,
      notes: event.notes,
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingEvent) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'extraStaffNeeded' ? parseInt(value) : value,
    }))
  }

  const filteredEvents = filterType ? events.filter((e) => e.type === filterType) : events
  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date))

  const renderListView = () => (
    <div className="grid-container">
      {sortedEvents.map((event) => (
        <div key={event.id} className="card">
          <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>{event.name}</h3>
            <div className="flex-gap-1">
              <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(event)}>
                <Edit size={16} />
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm(`Delete ${event.name}?`)) {
                    deleteMutation.mutate(event.id)
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <Badge type="eventType" value={event.type} style={{ marginBottom: '0.5rem' }} />
          <div className="text-sm" style={{ marginTop: '0.5rem' }}>
            <div><strong>Date:</strong> {format(new Date(event.date), 'MMM dd, yyyy')}</div>
            <div><strong>Time:</strong> {event.time}</div>
            {event.extraStaffNeeded > 0 && (
              <div><strong>Extra Staff:</strong> +{event.extraStaffNeeded}</div>
            )}
            {event.notes && <div><strong>Notes:</strong> {event.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  )

  const renderCalendarView = () => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)

    const days = []
    for (let i = firstDay.getDay(); i > 0; i--) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div>
        <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {dayLabels.map((label) => (
            <div key={label} style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {label}
            </div>
          ))}
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="calendar-day other-month"></div>
            }

            const dayEvents = sortedEvents.filter(
              (e) => format(new Date(e.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
            )

            return (
              <div key={format(day, 'yyyy-MM-dd')} className="calendar-day">
                <div className="calendar-day-number">{format(day, 'd')}</div>
                <div className="calendar-day-content">
                  {dayEvents.map((event) => (
                    <div key={event.id} style={{ fontSize: '0.65rem', margin: '0.125rem 0' }}>
                      📌 {event.name.substring(0, 8)}
                    </div>
                  ))}
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
        <h1>Events</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          Add Event
        </button>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, marginRight: '1rem' }}>
            <label>Filter by Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-gap-1" style={{ alignSelf: 'flex-end' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setViewType('list')}
              style={{ opacity: viewType === 'list' ? 1 : 0.6 }}
            >
              List
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setViewType('calendar')}
              style={{ opacity: viewType === 'calendar' ? 1 : 0.6 }}
            >
              Calendar
            </button>
          </div>
        </div>

        {sortedEvents.length === 0 ? (
          <p className="text-muted">No events found</p>
        ) : viewType === 'list' ? (
          renderListView()
        ) : (
          renderCalendarView()
        )}
      </div>

      <Modal
        isOpen={showModal}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        footer={
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingEvent ? 'Update' : 'Add'} Event
          </button>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" value={formData.type} onChange={handleInputChange} required>
              <option value="">Select a type</option>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Extra Staff Needed</label>
            <input
              type="number"
              name="extraStaffNeeded"
              value={formData.extraStaffNeeded}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
            ></textarea>
          </div>
        </form>
      </Modal>
    </div>
  )
}
