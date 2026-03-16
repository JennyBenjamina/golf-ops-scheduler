# Golf Operations Scheduler - Node.js Backend

A complete Express.js backend with SQLite for managing golf club operations scheduling, staff preferences, and automated shift assignment.

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

Server runs on `http://localhost:3001`

## Architecture Overview

### Stack
- **Framework**: Express.js 4.18
- **Database**: SQLite with better-sqlite3
- **CORS**: Enabled for development (localhost:5173, localhost:3001)
- **Port**: 3001

### Directory Structure

```
Golf Ops Scheduler/
├── package.json                    # Root dependencies
├── server/
│   ├── index.js                   # Express server entry point
│   ├── db.js                      # Database initialization
│   ├── scheduler.js               # Auto-scheduling engine
│   └── routes/
│       ├── staff.js               # Staff CRUD endpoints
│       ├── shifts.js              # Shift templates CRUD
│       ├── events.js              # Event management
│       ├── preferences.js         # Staff preferences
│       ├── time-off.js            # Time-off request management
│       ├── schedule.js            # Schedule assignments & generation
│       └── weather.js             # Weather flags (reduce staff)
└── client/                         # React frontend (served from dist/)
```

## Database Schema

### 7 Tables with full relationships

1. **staff** - Employee records (4 assistant pros, 3 leadership staff)
2. **shift_templates** - Predefined shifts (Opening, Mid, Closing, etc.)
3. **events** - Golf events (tournaments, lessons, outings)
4. **staff_preferences** - Staff shift preferences by day of week
5. **time_off_requests** - Vacation/sick leave requests (pending/approved/denied)
6. **schedules** - Actual shift assignments with status tracking
7. **weather_flags** - Weather conditions with staff reduction flags

See `BACKEND_STRUCTURE.md` for complete schema details.

## API Routes (RESTful)

### Staff Management (`/api/staff`)
- `GET /` - List active staff (filter by role)
- `GET /:id` - Get specific staff member
- `POST /` - Create staff member
- `PUT /:id` - Update staff member
- `DELETE /:id` - Soft delete (set inactive)

### Shift Templates (`/api/shifts`)
- `GET /` - List all shift templates
- `POST /` - Create shift template
- `PUT /:id` - Update shift template
- `DELETE /:id` - Delete shift template

### Events (`/api/events`)
- `GET /` - List events (optional date range filter)
- `POST /` - Create event
- `PUT /:id` - Update event
- `DELETE /:id` - Delete event

### Staff Preferences (`/api/preferences`)
- `GET /:staffId` - Get staff member's preferences
- `POST /` - Create/update preference (upsert)
- `DELETE /:id` - Delete preference

### Time-Off (`/api/time-off`)
- `GET /` - List requests (filter by staffId, status)
- `POST /` - Create request
- `PUT /:id` - Update request (approve/deny)
- `DELETE /:id` - Delete request

### Schedule (`/api/schedule`)
- `GET /` - Get assignments (required: start & end date)
- `POST /` - Create single assignment
- `PUT /:id` - Update assignment
- `DELETE /:id` - Delete assignment
- `POST /generate` - Auto-generate schedule for date range

### Weather (`/api/weather`)
- `GET /` - List weather flags (optional date range)
- `POST /` - Create/update weather flag (upsert)
- `DELETE /:id` - Delete weather flag

See `API_EXAMPLES.md` for detailed request/response examples.

## Core Features

### Intelligent Auto-Scheduler

The `POST /api/schedule/generate` endpoint uses a sophisticated algorithm:

**Scoring System:**
1. Preference Bonus (+0 to +5) - Rewards preferred shifts/days
2. Work-Life Balance (-10 if 5+ days worked) - Ensures 2 days off minimum
3. Variety (-5 if same shift as yesterday) - Prevents monotonous scheduling
4. Fairness (+3 if <3 days this week) - Equitable distribution

**Constraints:**
- No double-booking same person same day
- Respects approved time-off
- Considers weather (reduces staff count if flagged)
- Adds extra staff for tournaments/outings
- Leadership staff only assigned to Starter shift

### Data Integrity
- Foreign key constraints enforced
- UNIQUE constraints prevent duplicate assignments
- Soft-delete preserves staff history
- Upsert patterns for preferences and weather
- Transaction support for batch operations

### Error Handling
- Comprehensive try-catch in all routes
- Foreign key validation before operations
- Duplicate constraint handling
- 404 responses for missing resources
- 400 responses for invalid input

## Default Seeding

On first run, database auto-seeds with:

**Shift Templates (7 total):**
- Opening (6:30-14:30)
- Mid (9:00-17:00)
- Closing (12:00-20:00)
- Starter (7:00-11:00)
- Cart Barn (6:00-14:00)
- Range (8:00-16:00)
- Lesson Block (9:00-12:00)

**Sample Staff (7 total):**
- Alex Rivera (assistant_pro)
- Jordan Chen (assistant_pro)
- Sam Nakamura (assistant_pro)
- Taylor Brooks (assistant_pro)
- Chris Morgan (head_pro)
- Pat Sullivan (director_of_golf)
- Jamie Reese (caddy_master)

## Development Notes

### Date/Time Format
- Dates: ISO 8601 format (`YYYY-MM-DD`)
- Times: 24-hour format (`HH:MM`)
- Timestamps: ISO 8601 with timezone (`YYYY-MM-DDTHH:MM:SSZ`)

### CORS Configuration
```javascript
// Enabled for:
- http://localhost:5173  (Vite dev server)
- http://localhost:3001  (API origin)
```

### Production Deployment
- Server serves React build from `client/dist/`
- SPA fallback routes all non-API requests to `index.html`
- Set NODE_ENV=production for optimal performance
- Database file (`golf_ops.db`) persists in `server/` directory

### Database Transactions
Complex operations use SQLite transactions:
```javascript
const transaction = db.transaction(() => {
  // Multiple operations here execute atomically
});
transaction();
```

## Example Usage

### Generate Weekly Schedule
```bash
curl -X POST http://localhost:3001/api/schedule/generate \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-03-15",
    "endDate": "2026-03-22"
  }'
```

### Create Tournament Event
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spring Championship",
    "type": "tournament",
    "date": "2026-03-20",
    "start_time": "08:00",
    "end_time": "17:00",
    "extra_staff_needed": 2
  }'
```

### View Schedule with Staff Details
```bash
curl "http://localhost:3001/api/schedule?start=2026-03-15&end=2026-03-22"
```

Response includes:
- Staff names and IDs
- Shift names, start/end times
- Event names (if assigned)
- Assignment status
- Auto-generation scoring notes

## Performance Considerations

- SQLite with better-sqlite3 provides fast synchronous operations
- Prepared statements prevent SQL injection
- Indexes on foreign keys for efficient joins
- SELECT queries joined with staff, shift, and event details
- Lazy loading of data (only retrieve date ranges requested)

## Security

- All inputs validated before database operations
- Parameterized queries prevent SQL injection
- Foreign key constraints enforce referential integrity
- Soft-delete for staff preserves audit trail
- CORS restricted to known origins

## Troubleshooting

### Database Lock
If you get "database is locked" error:
- Ensure only one Node process is running
- Delete `server/golf_ops.db` to reset (will re-seed)

### Foreign Key Errors
- Verify staff member exists before assigning shifts
- Verify shift template exists before scheduling
- Check that referenced IDs are correct

### CORS Issues
- Ensure React dev server runs on localhost:5173
- Check `server/index.js` CORS configuration
- Use credentials: true for authenticated requests

## Maintenance

### Backup Database
```bash
cp server/golf_ops.db server/golf_ops.db.backup
```

### Reset Database
```bash
rm server/golf_ops.db  # Deletes current data
npm start              # Re-seeds on startup
```

### Check Database Integrity
```bash
sqlite3 server/golf_ops.db ".tables"
sqlite3 server/golf_ops.db ".schema"
```

## Dependencies

```json
{
  "express": "^4.18.2",
  "better-sqlite3": "^9.2.2",
  "cors": "^2.8.5"
}
```

All dependencies are minimal, battle-tested, and production-ready.

## Testing

Test endpoints using curl, Postman, or the integrated API client:

```bash
# Health check
curl http://localhost:3001/api/staff

# Full workflow test
1. Create event: POST /api/events
2. Set preferences: POST /api/preferences
3. Create time-off: POST /api/time-off
4. Generate schedule: POST /api/schedule/generate
5. View results: GET /api/schedule?start=...&end=...
```

## License

Built for Golf Operations Scheduling System
