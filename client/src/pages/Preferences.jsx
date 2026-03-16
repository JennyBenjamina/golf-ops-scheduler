import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import * as api from '../api'
import { DAYS, SHIFTS, PREFERENCE_LEVELS } from '../constants'

export default function Preferences() {
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [preferences, setPreferences] = useState({})

  const queryClient = useQueryClient()

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: api.fetchStaff,
  })

  const { data: allPreferences = [] } = useQuery({
    queryKey: ['preferences'],
    queryFn: api.fetchPreferences,
  })

  const saveMutation = useMutation({
    mutationFn: api.savePreference,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })

  const assistantPros = staff.filter((s) => s.role === 'assistant_pro')

  const handleStaffSelect = (staffId) => {
    setSelectedStaffId(staffId)
    const staffPrefs = allPreferences.filter((p) => p.staffId === staffId)
    const prefsMap = {}
    staffPrefs.forEach((p) => {
      prefsMap[`${p.dayOfWeek}-${p.shiftTemplate}`] = p.level
    })
    setPreferences(prefsMap)
  }

  const handlePreferenceChange = (dayOfWeek, shift, level) => {
    const key = `${dayOfWeek}-${shift}`
    const newLevel = preferences[key] === level ? 3 : level
    setPreferences((prev) => ({
      ...prev,
      [key]: newLevel,
    }))

    saveMutation.mutate({
      staffId: selectedStaffId,
      dayOfWeek,
      shiftTemplate: shift,
      level: newLevel,
    })
  }

  const getPreferenceColor = (level) => {
    return PREFERENCE_LEVELS.find((p) => p.value === level)?.color || '#9ca3af'
  }

  const getPreferenceLabel = (level) => {
    return PREFERENCE_LEVELS.find((p) => p.value === level)?.label || 'Neutral'
  }

  return (
    <div>
      <h1>Shift Preferences</h1>

      <div className="card">
        <div className="form-group">
          <label>Select Assistant Pro</label>
          <select value={selectedStaffId} onChange={(e) => handleStaffSelect(e.target.value)}>
            <option value="">-- Select a staff member --</option>
            {assistantPros.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {selectedStaffId && (
          <div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Preference Legend</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {PREFERENCE_LEVELS.map((level) => (
                  <div key={level.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: level.color,
                      }}
                    ></div>
                    <span style={{ fontSize: '0.85rem' }}>{level.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    {SHIFTS.map((shift) => (
                      <th key={shift}>{shift}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, dayIdx) => (
                    <tr key={day}>
                      <td><strong>{day}</strong></td>
                      {SHIFTS.map((shift) => {
                        const key = `${dayIdx}-${shift}`
                        const level = preferences[key] || 3
                        return (
                          <td
                            key={key}
                            onClick={() => handlePreferenceChange(dayIdx, shift, level)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: getPreferenceColor(level),
                              color: 'white',
                              fontWeight: '600',
                              textAlign: 'center',
                              transition: 'all 0.2s ease',
                              opacity: 0.8,
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.opacity = '1'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.opacity = '0.8'
                            }}
                          >
                            {getPreferenceLabel(level)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '6px', fontSize: '0.85rem' }}>
              💡 Click on any cell to change preference. Preferences are saved automatically.
            </div>
          </div>
        )}

        {!selectedStaffId && (
          <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
            Select an assistant pro to view or edit their shift preferences
          </div>
        )}
      </div>
    </div>
  )
}
