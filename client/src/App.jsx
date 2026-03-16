import React, { useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Briefcase,
  Sliders,
  Clock,
  Cloud,
} from 'lucide-react'

import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Staff from './pages/Staff'
import Events from './pages/Events'
import Preferences from './pages/Preferences'
import TimeOff from './pages/TimeOff'
import Weather from './pages/Weather'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/schedule', label: 'Schedule', icon: Calendar },
    { path: '/staff', label: 'Staff', icon: Users },
    { path: '/events', label: 'Events', icon: Briefcase },
    { path: '/preferences', label: 'Preferences', icon: Sliders },
    { path: '/timeoff', label: 'Time Off', icon: Clock },
    { path: '/weather', label: 'Weather', icon: Cloud },
  ]

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">⛳ Golf Ops Scheduler</div>
        </div>
        <nav>
          <ul className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path} className="nav-item">
                  <button
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/events" element={<Events />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/timeoff" element={<TimeOff />} />
            <Route path="/weather" element={<Weather />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
