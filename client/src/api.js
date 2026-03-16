const API_BASE = '/api';

// Helper function for fetch requests
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Staff API
export async function fetchStaff() {
  return apiCall('/staff');
}

export async function createStaff(staffData) {
  return apiCall('/staff', {
    method: 'POST',
    body: JSON.stringify(staffData),
  });
}

export async function updateStaff(staffId, staffData) {
  return apiCall(`/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(staffData),
  });
}

export async function deleteStaff(staffId) {
  return apiCall(`/staff/${staffId}`, {
    method: 'DELETE',
  });
}

// Shifts API
export async function fetchShifts() {
  return apiCall('/shifts');
}

export async function createShift(shiftData) {
  return apiCall('/shifts', {
    method: 'POST',
    body: JSON.stringify(shiftData),
  });
}

export async function updateShift(shiftId, shiftData) {
  return apiCall(`/shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(shiftData),
  });
}

// Events API
export async function fetchEvents() {
  return apiCall('/events');
}

export async function createEvent(eventData) {
  return apiCall('/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
}

export async function updateEvent(eventId, eventData) {
  return apiCall(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  });
}

export async function deleteEvent(eventId) {
  return apiCall(`/events/${eventId}`, {
    method: 'DELETE',
  });
}

// Preferences API
export async function fetchPreferences() {
  return apiCall('/preferences');
}

export async function savePreference(preferenceData) {
  return apiCall('/preferences', {
    method: 'POST',
    body: JSON.stringify(preferenceData),
  });
}

export async function deletePreference(preferencesId) {
  return apiCall(`/preferences/${preferencesId}`, {
    method: 'DELETE',
  });
}

// Time Off API
export async function fetchTimeOff() {
  return apiCall('/timeoff');
}

export async function createTimeOff(timeOffData) {
  return apiCall('/timeoff', {
    method: 'POST',
    body: JSON.stringify(timeOffData),
  });
}

export async function updateTimeOff(timeOffId, timeOffData) {
  return apiCall(`/timeoff/${timeOffId}`, {
    method: 'PUT',
    body: JSON.stringify(timeOffData),
  });
}

// Schedule API
export async function fetchSchedule(startDate, endDate) {
  return apiCall(`/schedule?startDate=${startDate}&endDate=${endDate}`);
}

export async function createAssignment(assignmentData) {
  return apiCall('/schedule/assignment', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

export async function updateAssignment(assignmentId, assignmentData) {
  return apiCall(`/schedule/assignment/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(assignmentData),
  });
}

export async function deleteAssignment(assignmentId) {
  return apiCall(`/schedule/assignment/${assignmentId}`, {
    method: 'DELETE',
  });
}

export async function generateSchedule(startDate, endDate) {
  return apiCall('/schedule/generate', {
    method: 'POST',
    body: JSON.stringify({ startDate, endDate }),
  });
}

// Weather API
export async function fetchWeather() {
  return apiCall('/weather');
}

export async function saveWeather(weatherData) {
  return apiCall('/weather', {
    method: 'POST',
    body: JSON.stringify(weatherData),
  });
}

export async function deleteWeather(weatherId) {
  return apiCall(`/weather/${weatherId}`, {
    method: 'DELETE',
  });
}
