import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, CheckCircle, XCircle } from 'lucide-react'
import * as api from '../api'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { TIME_OFF_REASONS } from '../constants'

export default function TimeOff() {
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [formData, setFormData] = useState({
    staffId: '',
    startDate: '',
    endDate: '',
    reason: '',
  })

  const queryClient = useQueryClient()

  const { data: timeOff = [] } = useQuery({
    queryKey: ['timeoff'],
    queryFn: api.fetchTimeOff,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: api.fetchStaff,
  })

  const createMutation = useMutation({
    mutationFn: api.createTimeOff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoff'] })
      resetForm()
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateTimeOff(data.id, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoff'] })
    },
  })

  const resetForm = () => {
    setFormData({
      staffId: '',
      startDate: '',
      endDate: '',
      reason: '',
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const handleApprove = (request) => {
    updateMutation.mutate({
      id: request.id,
      status: 'approved',
    })
  }

  const handleDeny = (request) => {
    updateMutation.mutate({
      id: request.id,
      status: 'denied',
    })
  }

  const filteredTimeOff = filterStatus
    ? timeOff.filter((r) => r.status === filterStatus)
    : timeOff

  const sortedTimeOff = [...filteredTimeOff].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  )

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1>Time Off Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Request Time Off
        </button>
      </div>

      <div className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <label>Filter by Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        {sortedTimeOff.length === 0 ? (
          <p className="text-muted">No time off requests</p>
        ) : (
          <div>
            {sortedTimeOff.map((request) => (
              <div key={request.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">{request.staffName}</div>
                  <div className="list-item-subtitle">
                    {format(new Date(request.startDate), 'MMM dd')} -{' '}
                    {format(new Date(request.endDate), 'MMM dd, yyyy')}
                  </div>
                  <div className="list-item-subtitle" style={{ marginTop: '0.25rem' }}>
                    {request.reason}
                  </div>
                </div>
                <div className="flex-gap-1">
                  <Badge type="status" value={request.status} />
                  {request.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(request)}
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeny(request)}
                        disabled={updateMutation.isPending}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        title="Request Time Off"
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        footer={
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            Submit Request
          </button>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Staff Member</label>
            <select
              name="staffId"
              value={formData.staffId}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Select a staff member --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Reason</label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              required
            >
              <option value="">-- Select a reason --</option>
              {TIME_OFF_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}
