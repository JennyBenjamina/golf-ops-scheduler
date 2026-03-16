import React from 'react'

const roleColorMap = {
  assistant_pro: 'badge-blue',
  head_pro: 'badge-green',
  director_of_golf: 'badge-gold',
  caddy_master: 'badge-teal',
}

const statusColorMap = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  denied: 'badge-red',
  active: 'badge-green',
  inactive: 'badge-gray',
}

const eventTypeColorMap = {
  tournament: 'badge-red',
  member_event: 'badge-blue',
  lesson: 'badge-purple',
  outing: 'badge-orange',
  other: 'badge-gray',
}

export default function Badge({ type = 'default', value, className = '' }) {
  let badgeClass = 'badge'

  if (type === 'role' && roleColorMap[value]) {
    badgeClass += ` ${roleColorMap[value]}`
  } else if (type === 'status' && statusColorMap[value]) {
    badgeClass += ` ${statusColorMap[value]}`
  } else if (type === 'eventType' && eventTypeColorMap[value]) {
    badgeClass += ` ${eventTypeColorMap[value]}`
  } else {
    badgeClass += ' badge-gray'
  }

  return <span className={`${badgeClass} ${className}`}>{value}</span>
}
