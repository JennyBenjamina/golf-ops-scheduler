const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }
  return response.json();
}

// Staff
export const fetchStaff = () => apiCall('/staff');
export const createStaff = (data) => apiCall('/staff', { method: 'POST', body: JSON.stringify(data) });
export const updateStaff = (id, data) => apiCall(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStaff = (id) => apiCall(`/staff/${id}`, { method: 'DELETE' });

// Shifts
export const fetchShifts = () => apiCall('/shifts');
export const createShift = (data) => apiCall('/shifts', { method: 'POST', body: JSON.stringify(data) });
export const updateShift = (id, data) => apiCall(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteShift = (id) => apiCall(`/shifts/${id}`, { method: 'DELETE' });

// Events
export const fetchEvents = () => apiCall('/events');
export const createEvent = (data) => apiCall('/events', { method: 'POST', body: JSON.stringify(data) });
export const updateEvent = (id, data) => apiCall(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEvent = (id) => apiCall(`/events/${id}`, { method: 'DELETE' });

// Preferences
export const fetchPreferences = (staffId) => apiCall(`/preferences/${staffId}`);
export const savePreference = (data) => apiCall('/preferences', { method: 'POST', body: JSON.stringify(data) });
export const deletePreference = (id) => apiCall(`/preferences/${id}`, { method: 'DELETE' });

// Time Off  (endpoint is /time-off, not /timeoff)
export const fetchTimeOff = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiCall(`/time-off${qs ? `?${qs}` : ''}`);
};
export const createTimeOff = (data) => apiCall('/time-off', { method: 'POST', body: JSON.stringify(data) });
export const updateTimeOff = (id, data) => apiCall(`/time-off/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTimeOff = (id) => apiCall(`/time-off/${id}`, { method: 'DELETE' });

// Schedule  (params are start/end, assignments live at /schedule)
export const fetchSchedule = (start, end) => apiCall(`/schedule?start=${start}&end=${end}`);
export const createAssignment = (data) => apiCall('/schedule', { method: 'POST', body: JSON.stringify(data) });
export const updateAssignment = (id, data) => apiCall(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAssignment = (id) => apiCall(`/schedule/${id}`, { method: 'DELETE' });
export const generateSchedule = (startDate, endDate) =>
  apiCall('/schedule/generate', { method: 'POST', body: JSON.stringify({ startDate, endDate }) });
export const clearSchedule = (startDate, endDate) =>
  apiCall('/schedule/clear', { method: 'POST', body: JSON.stringify({ startDate, endDate }) });

// Weather
export const fetchWeather = () => apiCall('/weather');
export const saveWeather = (data) => apiCall('/weather', { method: 'POST', body: JSON.stringify(data) });
export const deleteWeather = (id) => apiCall(`/weather/${id}`, { method: 'DELETE' });
