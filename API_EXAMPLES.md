# Golf Operations Scheduler - API Examples

## Server Setup

```bash
npm install
npm start
```

Server runs on `http://localhost:3001`

## API Endpoints Examples

### Staff Management

#### Get all active staff
```bash
GET /api/staff
```

#### Get staff by role
```bash
GET /api/staff?role=assistant_pro
```

#### Get specific staff member
```bash
GET /api/staff/1
```

#### Create staff member
```bash
POST /api/staff
Content-Type: application/json

{
  "name": "Jordan Chen",
  "role": "assistant_pro",
  "email": "jordan@golf.com",
  "phone": "555-1234",
  "max_hours_per_week": 40
}
```

#### Update staff member
```bash
PUT /api/staff/1
Content-Type: application/json

{
  "max_hours_per_week": 38,
  "phone": "555-5678"
}
```

#### Delete staff (soft delete)
```bash
DELETE /api/staff/1
```

---

### Shift Templates

#### Get all shift templates
```bash
GET /api/shifts
```

Returns default shifts:
- Opening (6:30-14:30)
- Mid (9:00-17:00)
- Closing (12:00-20:00)
- Starter (7:00-11:00)
- Cart Barn (6:00-14:00)
- Range (8:00-16:00)
- Lesson Block (9:00-12:00)

#### Create custom shift template
```bash
POST /api/shifts
Content-Type: application/json

{
  "name": "Evening",
  "start_time": "16:00",
  "end_time": "22:00",
  "role_type": "assistant_pro",
  "description": "Evening shift",
  "requires_count": 2
}
```

---

### Events

#### Get all events
```bash
GET /api/events
```

#### Get events in date range
```bash
GET /api/events?start=2026-03-15&end=2026-03-22
```

#### Create tournament event (needs extra staff)
```bash
POST /api/events
Content-Type: application/json

{
  "name": "Spring Championship",
  "type": "tournament",
  "date": "2026-03-20",
  "start_time": "08:00",
  "end_time": "17:00",
  "extra_staff_needed": 2,
  "notes": "All professional staff required"
}
```

#### Create member event
```bash
POST /api/events
Content-Type: application/json

{
  "name": "Ladies Outing",
  "type": "member_event",
  "date": "2026-03-18",
  "start_time": "09:00",
  "end_time": "14:00",
  "extra_staff_needed": 1
}
```

---

### Staff Preferences

#### Get preferences for staff member
```bash
GET /api/preferences/1
```

#### Set preference (upsert)
```bash
POST /api/preferences
Content-Type: application/json

{
  "staff_id": 1,
  "day_of_week": 2,
  "shift_template_id": 1,
  "preference_level": 5,
  "notes": "Alex loves Tuesday mornings"
}
```

Days: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

Preference levels: 1=weak, 2=fair, 3=neutral, 4=good, 5=strongly prefer

#### Delete preference
```bash
DELETE /api/preferences/1
```

---

### Time-Off Requests

#### Get all pending time-off requests
```bash
GET /api/time-off?status=pending
```

#### Get requests for specific staff
```bash
GET /api/time-off?staffId=1&status=approved
```

#### Create time-off request
```bash
POST /api/time-off
Content-Type: application/json

{
  "staff_id": 1,
  "start_date": "2026-03-25",
  "end_date": "2026-03-29",
  "reason": "Spring vacation"
}
```

Status: pending, approved, denied

#### Approve time-off request
```bash
PUT /api/time-off/1
Content-Type: application/json

{
  "status": "approved"
}
```

#### Deny time-off request
```bash
PUT /api/time-off/1
Content-Type: application/json

{
  "status": "denied",
  "reason": "Too many requests that week"
}
```

---

### Schedule Management

#### Get schedule for date range
```bash
GET /api/schedule?start=2026-03-15&end=2026-03-22
```

Returns all assignments with staff names, shift times, and event details

#### Manually assign shift
```bash
POST /api/schedule
Content-Type: application/json

{
  "staff_id": 1,
  "date": "2026-03-20",
  "shift_template_id": 1,
  "event_id": null,
  "status": "scheduled",
  "notes": "Manual assignment"
}
```

#### Update assignment status
```bash
PUT /api/schedule/1
Content-Type: application/json

{
  "status": "confirmed"
}
```

Statuses: scheduled, confirmed, swapped, cancelled

#### Delete assignment
```bash
DELETE /api/schedule/1
```

#### Auto-generate schedule
```bash
POST /api/schedule/generate
Content-Type: application/json

{
  "startDate": "2026-03-15",
  "endDate": "2026-03-22"
}
```

Response:
```json
{
  "message": "Schedule generated successfully",
  "count": 28,
  "assignments": [
    {
      "staff_id": 1,
      "date": "2026-03-15",
      "shift_template_id": 1,
      "event_id": null,
      "status": "scheduled",
      "notes": "Auto-generated (score: 8)"
    }
  ]
}
```

---

### Weather Flags

#### Get weather flags
```bash
GET /api/weather
```

#### Get weather for date range
```bash
GET /api/weather?start=2026-03-15&end=2026-03-22
```

#### Create/update weather flag (upsert)
```bash
POST /api/weather
Content-Type: application/json

{
  "date": "2026-03-20",
  "condition": "rain",
  "reduce_staff": 1,
  "notes": "Heavy rain expected, reduce staff by 1 per shift"
}
```

Conditions: rain, storm, extreme_heat, extreme_cold, snow, other

#### Delete weather flag
```bash
DELETE /api/weather/1
```

---

## Auto-Scheduler Algorithm Details

The scheduler assigns shifts using intelligent scoring:

### Scoring Factors

1. **Preferences** (+0 to +5)
   - Adds preference_level if staff prefers this shift on this day of week

2. **Work-Life Balance** (-10 penalty)
   - Applied if staff already worked 5+ days this week
   - Ensures 2 days off minimum per week

3. **Variety** (-5 penalty)
   - Applied if staff worked same shift yesterday
   - Prevents monotonous scheduling

4. **Fairness** (+3 bonus)
   - Applied if staff has <3 days scheduled this week
   - Ensures equitable distribution

### Constraints

- Cannot double-book same person same day
- Respects approved time-off (skips those dates)
- Considers weather (reduces staff count if flagged)
- Adds extra staff for tournaments/outings
- Leadership staff (head_pro, director_of_golf, caddy_master) only get Starter shifts

### Example Scheduling Decision

For Tuesday, March 18th, "Opening" shift (6:30-14:30):
- Alex Rivera: score = 4 (prefers Tuesdays) + 3 (fair distribution) - 0 (other factors) = 7
- Jordan Chen: score = 2 (weak preference) - 5 (worked opening yesterday) = -3
- Sam Nakamura: score = 5 (strongly prefers) = 5
- Taylor Brooks: score = 0 + 3 (fairness) = 3

Result: Alex Rivera gets assigned (highest score of 7)

---

## Database Seeding

On first run, the server automatically creates and seeds:

### Default Shift Templates (7 total)
- Opening, Mid, Closing, Starter, Cart Barn, Range, Lesson Block

### Sample Staff (7 total)
- **Assistant Pros**: Alex Rivera, Jordan Chen, Sam Nakamura, Taylor Brooks
- **Leadership**: Chris Morgan (head_pro), Pat Sullivan (director_of_golf), Jamie Reese (caddy_master)

This provides a complete working system ready for scheduling.
