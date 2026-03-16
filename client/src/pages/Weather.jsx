import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import * as api from '../api'
import Modal from '../components/Modal'
import { CONDITIONS, CONDITION_EMOJIS as conditionEmojis } from '../constants'

export default function Weather() {
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingWeather, setEditingWeather] = useState(null)
  const [formData, setFormData] = useState({
    date: '',
    condition: '',
    reduceStaff: false,
    notes: '',
  })

  const queryClient = useQueryClient()

  const { data: weather = [] } = useQuery({
    queryKey: ['weather'],
    queryFn: api.fetchWeather,
  })

  const createMutation = useMutation({
    mutationFn: api.saveWeather,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather'] })
      resetForm()
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.saveWeather({ ...data, id: editingWeather.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather'] })
      resetForm()
      setShowModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteWeather,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weather'] })
    },
  })

  const resetForm = () => {
    setFormData({
      date: '',
      condition: '',
      reduceStaff: false,
      notes: '',
    })
    setEditingWeather(null)
    setSelectedDate(null)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingWeather) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const openAddModal = (date) => {
    resetForm()
    setSelectedDate(date)
    setFormData((prev) => ({
      ...prev,
      date: format(date, 'yyyy-MM-dd'),
    }))
    setShowModal(true)
  }

  const openEditModal = (w) => {
    setEditingWeather(w)
    setFormData({
      date: w.date,
      condition: w.condition,
      reduceStaff: w.reduceStaff,
      notes: w.notes,
    })
    setShowModal(true)
  }

  const today = new Date()
  const endDate = addDays(today, 42)

  const calendarDays = []
  let currentDate = today
  while (currentDate <= endDate) {
    calendarDays.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }

  const weeks = []
  let currentWeek = []
  const startDayOfWeek = today.getDay()

  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null)
  }

  calendarDays.forEach((day) => {
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

  return (
    <div>
      <h1>Weather Management</h1>

      <div className="card">
        <p className="text-sm" style={{ marginBottom: '1.5rem' }}>
          Click on a date to add or edit weather information for the next 6 weeks
        </p>

        <div style={{ overflowX: 'auto' }}>
          <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {dayLabels.map((label) => (
              <div
                key={label}
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #e5e7eb',
                }}
              >
                {label}
              </div>
            ))}

            {weeks.flat().map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="calendar-day other-month"></div>
              }

              const weatherForDay = weather.find(
                (w) => format(new Date(w.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              )

              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className="calendar-day"
                  onClick={() => openAddModal(day)}
                  style={{
                    backgroundColor: weatherForDay ? '#fef3c7' : 'white',
                    borderColor: weatherForDay ? '#f59e0b' : '#e5e7eb',
                  }}
                >
                  <div className="calendar-day-number">{format(day, 'd')}</div>
                  <div className="calendar-day-content">
                    {weatherForDay && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: '1.25rem' }}>
                          {conditionEmojis[weatherForDay.condition]}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '600' }}>
                          {weatherForDay.condition.replace('_', ' ')}
                        </div>
                        {weatherForDay.reduceStaff && (
                          <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: '600' }}>
                            ⚙️ Reduce
                          </div>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this weather flag?')) {
                              deleteMutation.mutate(weatherForDay.id)
                            }
                          }}
                          style={{ marginTop: '0.25rem' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        title={`Weather for ${selectedDate ? format(selectedDate, 'MMM dd, yyyy') : ''}`}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        footer={
          <div className="flex-gap-1">
            {editingWeather && (
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (confirm('Delete this weather flag?')) {
                    deleteMutation.mutate(editingWeather.id)
                    setShowModal(false)
                    resetForm()
                  }
                }}
              >
                Delete
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingWeather ? 'Update' : 'Add'} Weather
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Condition</label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Select a condition --</option>
              {CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {conditionEmojis[condition]} {condition.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="reduceStaff"
                checked={formData.reduceStaff}
                onChange={handleInputChange}
                style={{ marginRight: '0.5rem' }}
              />
              Reduce Staff Scheduled
            </label>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="e.g., Expected to clear by 2pm..."
            ></textarea>
          </div>
        </form>
      </Modal>
    </div>
  )
}
