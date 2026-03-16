import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2 } from 'lucide-react'
import * as api from '../api'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { ROLES } from '../constants'

export default function Staff() {
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [filterRole, setFilterRole] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    maxHoursPerWeek: 40,
    status: 'active',
  })

  const queryClient = useQueryClient()

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: api.fetchStaff,
  })

  const createMutation = useMutation({
    mutationFn: api.createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      resetForm()
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateStaff(editingStaff.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      resetForm()
      setShowModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      email: '',
      phone: '',
      maxHoursPerWeek: 40,
      status: 'active',
    })
    setEditingStaff(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (s) => {
    setEditingStaff(s)
    setFormData({
      name: s.name,
      role: s.role,
      email: s.email,
      phone: s.phone,
      maxHoursPerWeek: s.maxHoursPerWeek,
      status: s.status,
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingStaff) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'maxHoursPerWeek' ? parseInt(value) : value,
    }))
  }

  const filteredStaff = filterRole ? staff.filter((s) => s.role === filterRole) : staff

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1>Staff</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      <div className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <label>Filter by Role</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Max Hours/Week</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  No staff members found
                </td>
              </tr>
            ) : (
              filteredStaff.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td><Badge type="role" value={s.role} /></td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.maxHoursPerWeek}</td>
                  <td><Badge type="status" value={s.status} /></td>
                  <td>
                    <div className="flex-gap-1">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(s)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (confirm(`Delete ${s.name}?`)) {
                            deleteMutation.mutate(s.id)
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        title={editingStaff ? 'Edit Staff' : 'Add Staff'}
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        footer={
          <div>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingStaff ? 'Update' : 'Add'} Staff
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleInputChange} required>
              <option value="">Select a role</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Max Hours Per Week</label>
            <input
              type="number"
              name="maxHoursPerWeek"
              value={formData.maxHoursPerWeek}
              onChange={handleInputChange}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleInputChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  )
}
