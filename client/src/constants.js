export const ROLES = ['assistant_pro', 'head_pro', 'director_of_golf', 'caddy_master']

export const SHIFTS = ['Morning', 'Afternoon', 'Evening']

export const EVENT_TYPES = ['tournament', 'member_event', 'lesson', 'outing', 'other']

export const TIME_OFF_REASONS = [
  'Vacation',
  'Sick Leave',
  'Personal Day',
  'Family Emergency',
  'Other',
]

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export const PREFERENCE_LEVELS = [
  { value: 1, label: 'Avoid', color: '#dc2626' },
  { value: 2, label: 'Rather Not', color: '#f97316' },
  { value: 3, label: 'Neutral', color: '#eab308' },
  { value: 4, label: 'Prefer', color: '#84cc16' },
  { value: 5, label: 'Strongly Prefer', color: '#059669' },
]

export const CONDITIONS = ['rain', 'storm', 'extreme_heat', 'extreme_cold', 'snow', 'other']

export const CONDITION_EMOJIS = {
  rain: '🌧️',
  storm: '⛈️',
  extreme_heat: '🔥',
  extreme_cold: '❄️',
  snow: '❅',
  other: '⚠️',
}
