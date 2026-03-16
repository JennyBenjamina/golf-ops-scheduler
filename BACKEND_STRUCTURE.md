# Golf Operations Scheduler - Backend Structure

## Project Files Created

### Root Configuration
- **package.json** - Node.js project configuration with Express, better-sqlite3, and CORS dependencies

### Core Server Files
- **server/index.js** - Main Express server entry point (port 3001)
  - CORS configuration for development (localhost:5173)
  - Routes mounting
  - Static file serving for React build
  - Error handling middleware

- **server/db.js** - SQLite database initialization and connection
  - Creates all 7 database tables
  - Seeds default shift templates (Opening, Mid, Closing, Starter, Cart Barn, Range, Lesson Block)
  - Seeds sample staff (4 assistant pros, 3 leadership staff)
  - Enables foreign key constraints

- **server/scheduler.js** - Auto-scheduling engine
  - `generateSchedule(startDate, endDate)` function
  - Intelligent scoring system for staff assignment
  - Preference-based scheduling
  - Work-life balance enforcement (2 days off minimum per week)
  - Weather considerations
  - Event-based extra staffing

### API Routes

#### Staff Management
- **server/routes/staff.js**
  - GET /api/staff - List active staff (optional role filter)
  - GET /api/staff/:id - Get individual staff member
  - POST /api/staff - Create new staff member
  - PUT /api/staff/:id - Update staff member
  - DELETE /api/staff/:id - Soft delete (set inactive)

#### Shift Templates
- **server/routes/shifts.js**
  - GET /api/shifts - List all shift templates
  - POST /api/shifts - Create shift template
  - PUT /api/shifts/:id - Update shift template
  - DELETE /api/shifts/:id - Delete shift template

#### Events
- **server/routes/events.js**
  - GET /api/events - List events (optional date range)
  - POST /api/events - Create event
  - PUT /api/events/:id - Update event
  - DELETE /api/events/:id - Delete event

#### Staff Preferences
- **server/routes/preferences.js**
  - GET /api/preferences/:staffId - Get staff preferences
  - POST /api/preferences - Create/update preference (upsert)
  - DELETE /api/preferences/:id - Delete preference

#### Time Off Requests
- **server/routes/time-off.js**
  - GET /api/time-off - List requests (optional filters)
  - POST /api/time-off - Create request
  - PUT /api/time-off/:id - Update request (approve/deny)
  - DELETE /api/time-off/:id - Delete request

#### Schedule Management
- **server/routes/schedule.js**
  - GET /api/schedule - Get schedule with staff and shift details (required date range)
  - POST /api/schedule - Create single assignment
  - PUT /api/schedule/:id - Update assignment
  - DELETE /api/schedule/:id - Delete assignment
  - POST /api/schedule/generate - Auto-generate schedule

#### Weather
- **server/routes/weather.js**
  - GET /api/weather - List weather flags (optional date range)
  - POST /api/weather - Create/update weather flag (upsert)
  - DELETE /api/weather/:id - Delete weather flag

## Database Schema

### staff
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- role (TEXT) - assistant_pro, head_pro, director_of_golf, caddy_master
- email, phone (TEXT)
- max_hours_per_week (INTEGER, default 40)
- active (INTEGER, default 1)
- created_at (TEXT)

### shift_templates
- id (INTEGER PRIMARY KEY)
- name, start_time, end_time, role_type (TEXT)
- description (TEXT)
- requires_count (INTEGER, default 1)

### events
- id (INTEGER PRIMARY KEY)
- name, type, date, start_time, end_time (TEXT)
- extra_staff_needed (INTEGER, default 0)
- notes (TEXT)
- created_at (TEXT)

### staff_preferences
- id (INTEGER PRIMARY KEY)
- staff_id (FK), day_of_week, shift_template_id (FK)
- preference_level (INTEGER, 1-5)
- notes (TEXT)
- UNIQUE(staff_id, day_of_week, shift_template_id)

### time_off_requests
- id (INTEGER PRIMARY KEY)
- staff_id (FK), start_date, end_date (TEXT)
- reason (TEXT)
- status (TEXT) - pending, approved, denied
- created_at (TEXT)

### schedules
- id (INTEGER PRIMARY KEY)
- staff_id (FK), date, shift_template_id (FK), event_id (FK nullable)
- status (TEXT) - scheduled, confirmed, swapped, cancelled
- notes (TEXT)
- created_at (TEXT)
- UNIQUE(staff_id, date, shift_template_id)

### weather_flags
- id (INTEGER PRIMARY KEY)
- date (TEXT UNIQUE)
- condition (TEXT) - rain, storm, extreme_heat, extreme_cold, snow, other
- reduce_staff (INTEGER, default 0)
- notes (TEXT)

## How to Run

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

   The server will:
   - Initialize the SQLite database
   - Create all tables
   - Seed default data
   - Listen on port 3001
   - Serve React frontend from client/dist (when built)

## Auto-Scheduling Algorithm

The scheduler uses an intelligent scoring system:

1. **Preference Bonus** (+preference_level, 1-5)
   - Rewards scheduling staff on their preferred shifts/days

2. **Work-Life Balance** (-10 if 5+ days worked this week)
   - Ensures minimum 2 days off per week

3. **Variety** (-5 if same shift as yesterday)
   - Prevents monotonous repeating shifts

4. **Fairness** (+3 if <3 days scheduled this week)
   - Ensures equitable distribution

5. **Constraints Applied**:
   - Respects approved time-off
   - No double-booking same person same day
   - Considers weather (reduce staff if flagged)
   - Adds extra staff for tournaments/outings
   - Leadership staff only get Starter shift auto-assignments

## Features

- RESTful API design
- Foreign key constraints for data integrity
- Soft-delete for staff (preserves history)
- Upsert patterns for preferences and weather
- Comprehensive error handling
- CORS-enabled for development
- Static file serving for React SPA
- Transaction support for batch operations
- ISO 8601 date/time handling
