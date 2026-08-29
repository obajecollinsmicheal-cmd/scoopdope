# Analytics Contract

> On-chain progress tracking and milestone achievement recording for the scoopdope education platform.

## Overview

The Analytics Contract is a Soroban smart contract that records and tracks student progress across courses on the Stellar blockchain. It maintains a tamper-proof ledger of course completion, emits events for off-chain indexers, and provides query functions for aggregated analytics and milestone tracking.

**Key Features:**
- Per-student, per-course progress tracking (0–100%)
- Milestone achievement recording (25%, 50%, 75%, 100%)
- Event emission for progress updates and course completions
- Completion statistics and top performer tracking
- Time-based analytics (daily, weekly, monthly stats)
- Secondary indexing for efficient queries
- Admin-only reset and aggregation functions

---

## Contract Purpose

The contract serves as a **single source of truth** for student learning progress. When a student completes a module or module quiz, the backend records their progress percentage. The contract:

1. **Records progress atomically** — stores the exact timestamp and percentage
2. **Tracks milestones** — records when students reach 25%, 50%, 75%, and 100% completion
3. **Emits events** — enables off-chain indexers (e.g., Horizon) to subscribe to updates in real-time
4. **Enables analytics** — aggregates completion stats, top performers, and time-based trends
5. **Enforces access control** — only the student or admin can update their progress

---

## Storage Layout

### Instance Storage (Shared, Non-TTL)

| Key | Type | Description |
|---|---|---|
| `Admin` | `Address` | Contract administrator address. Set at initialization, can be transferred. |
| `TotalStudents` | `u32` | Cumulative count of unique students who have enrolled in at least one course. |
| `TotalCourses` | `u32` | Cumulative count of unique courses tracked. |
| `CompletionStats` | `CompletionStats` | Aggregated platform-wide stats: total completions, average completion rate. |
| `DailyStats(u64)` | `TimeBasedStats` | Daily snapshot: day identifier, completions, average progress. |
| `WeeklyStats(u64)` | `TimeBasedStats` | Weekly snapshot: week identifier, completions, average progress. |
| `MonthlyStats(u64)` | `TimeBasedStats` | Monthly snapshot: month identifier, completions, average progress. |
| `TopPerformers` | `Vec<TopPerformer>` | Leaderboard of top 10–100 students by completion count. |

### Persistent Storage (Per-Student, TTL-Extended)

| Key | Type | Description |
|---|---|---|
| `Progress(Address, Symbol)` | `ProgressRecord` | Student's progress for a specific course. TTL extended on every read. |
| `StudentCourses(Address)` | `Vec<Symbol>` | Secondary index: list of all course IDs a student has enrolled in. |
| `Milestone(Address, Symbol, u32)` | `MilestoneRecord` | Record of when student achieved a specific milestone (25%, 50%, 75%, 100%) in a course. |
| `StudentMilestones(Address, Symbol)` | `Vec<u32>` | Index: achieved milestone percentages for a student in a course. |

### Data Types

#### ProgressRecord
```rust
pub struct ProgressRecord {
    pub student: Address,          // Student's Stellar address
    pub course_id: Symbol,         // Course identifier (e.g., symbol_short!("RUST101"))
    pub progress_pct: u32,         // Progress percentage: 0–100
    pub completed: bool,           // true when progress_pct == 100
    pub timestamp: u64,            // Ledger timestamp at last update (seconds)
}
```

#### MilestoneRecord
```rust
pub struct MilestoneRecord {
    pub student: Address,          // Student's Stellar address
    pub course_id: Symbol,         // Course identifier
    pub milestone_pct: u32,        // Milestone percentage: 25, 50, 75, or 100
    pub achieved_at: u64,          // Ledger timestamp when milestone was achieved
}
```

#### CompletionStats
```rust
pub struct CompletionStats {
    pub total_completions: u32,    // Total course completions across all students
    pub avg_completion_rate: u32,  // Average completion percentage (0–100)
}
```

#### TimeBasedStats
```rust
pub struct TimeBasedStats {
    pub period: u64,               // Day/week/month identifier
    pub completions: u32,          // Number of courses completed in this period
    pub avg_progress: u32,         // Average progress percentage in this period
}
```

#### TopPerformer
```rust
pub struct TopPerformer {
    pub student: Address,          // Student's Stellar address
    pub completion_count: u32,     // Total courses completed by this student
    pub avg_progress: u32,         // Average progress across all their courses
}
```

---

## Public Functions

### Admin Functions

#### `initialize(env: Env, admin: Address)`
**Auth Required:** `admin` address must authorize  
**Purpose:** One-time contract initialization. Sets the admin address. Must be called exactly once.

**Parameters:**
- `admin: Address` — The Stellar address that will have admin permissions

**Errors:**
- Panics if already initialized
- Panics if `admin` does not authorize

**Example:**
```bash
# Initialize with admin address
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <SOURCE_KEY> \
  -- initialize \
  --admin <ADMIN_ADDRESS>
```

---

#### `set_admin(env: Env, new_admin: Address)`
**Auth Required:** Current admin must authorize  
**Purpose:** Transfer admin role to a new address.

**Parameters:**
- `new_admin: Address` — The Stellar address that will become the new admin

**Errors:**
- Panics if caller is not current admin
- Panics if `new_admin` does not authorize

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <CURRENT_ADMIN_KEY> \
  -- set_admin \
  --new-admin <NEW_ADMIN_ADDRESS>
```

---

#### `get_admin(env: Env) -> Address`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve the current admin address.

**Returns:** `Address` of the current administrator

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_admin
```

---

### Progress Recording Functions

#### `record_progress(env: Env, caller: Address, student: Address, course_id: Symbol, progress_pct: u32)`
**Auth Required:** `caller` must authorize  
**Purpose:** Record or update a student's progress in a course. Emits progress update and completion events. Auto-detects and records milestone achievements.

**Parameters:**
- `caller: Address` — The address initiating the call (must be student or admin)
- `student: Address` — The student whose progress is being recorded
- `course_id: Symbol` — The course identifier
- `progress_pct: u32` — Progress percentage (0–100 inclusive)

**Access Control:**
- ✅ Student can record their own progress
- ✅ Admin can record progress for any student
- ❌ Any other caller is rejected

**Errors:**
- Panics if `caller` is neither `student` nor `admin`
- Panics if `progress_pct > 100`

**Side Effects:**
- Updates `Progress(student, course_id)` in persistent storage
- Updates secondary index `StudentCourses(student)` if first time for this course
- Detects milestone achievements (25%, 50%, 75%, 100%) and records them
- Extends TTL for all written records (TTL threshold: 100 ledgers, extend to: 500 ledgers)
- Emits `("analytics", "prog_upd")` event with `(student, course_id, progress_pct)`
- Emits `("analytics", "completed")` event if `progress_pct == 100`
- Emits `("analytics", "milestone")` event if milestone achieved

**Example (Student Recording Own Progress):**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <STUDENT_KEY> \
  -- record_progress \
  --caller <STUDENT_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --course-id "RUST101" \
  --progress-pct 75
```

**Example (Admin Recording Progress):**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_KEY> \
  -- record_progress \
  --caller <ADMIN_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --course-id "PYTHON202" \
  --progress-pct 100
```

---

#### `reset_progress(env: Env, admin: Address, student: Address, course_id: Symbol)`
**Auth Required:** `admin` must authorize and match stored admin  
**Purpose:** Clear a student's progress record for a course (admin-only destructive operation).

**Parameters:**
- `admin: Address` — The admin address performing the reset
- `student: Address` — The student whose progress is being reset
- `course_id: Symbol` — The course to reset progress for

**Errors:**
- Panics if `admin` does not authorize
- Panics if `admin` is not the stored admin address

**Side Effects:**
- Removes `Progress(student, course_id)` from persistent storage
- Removes `course_id` from `StudentCourses(student)` secondary index
- **Does NOT** remove milestone records (historical audit trail)

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_KEY> \
  -- reset_progress \
  --admin <ADMIN_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --course-id "RUST101"
```

---

### Progress Query Functions

#### `get_progress(env: Env, student: Address, course_id: Symbol) -> Option<ProgressRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve a specific student's progress record for a course.

**Parameters:**
- `student: Address` — The student's Stellar address
- `course_id: Symbol` — The course identifier

**Returns:** `Some(ProgressRecord)` if found, `None` if not recorded

**Side Effect:** Extends TTL of the record on read (TTL threshold: 100 ledgers, extend to: 500 ledgers)

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_progress \
  --student <STUDENT_ADDRESS> \
  --course-id "RUST101"
```

**Example Output:**
```json
{
  "student": "GBBD....",
  "course_id": "RUST101",
  "progress_pct": 75,
  "completed": false,
  "timestamp": 1690000000
}
```

---

#### `get_all_progress(env: Env, student: Address) -> Vec<ProgressRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve all progress records for a student across all courses.

**Parameters:**
- `student: Address` — The student's Stellar address

**Returns:** Vector of `ProgressRecord` (empty if no courses enrolled)

**Side Effect:** Extends TTL of all records retrieved

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_all_progress \
  --student <STUDENT_ADDRESS>
```

---

#### `get_completed_courses(env: Env, student: Address) -> Vec<ProgressRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve only completed courses (progress_pct == 100) for a student.

**Parameters:**
- `student: Address` — The student's Stellar address

**Returns:** Vector of completed `ProgressRecord` entries

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_completed_courses \
  --student <STUDENT_ADDRESS>
```

---

#### `get_in_progress_courses(env: Env, student: Address) -> Vec<ProgressRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve only in-progress courses (progress_pct < 100) for a student.

**Parameters:**
- `student: Address` — The student's Stellar address

**Returns:** Vector of in-progress `ProgressRecord` entries

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_in_progress_courses \
  --student <STUDENT_ADDRESS>
```

---

#### `get_progress_paginated(env: Env, student: Address, offset: u32, limit: u32) -> Vec<ProgressRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve paginated progress records for a student.

**Parameters:**
- `student: Address` — The student's Stellar address
- `offset: u32` — Starting index (0-based)
- `limit: u32` — Maximum records to return

**Returns:** Vector of `ProgressRecord` for the requested page

**Example:**
```bash
# Get records 0–9
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_progress_paginated \
  --student <STUDENT_ADDRESS> \
  --offset 0 \
  --limit 10
```

---

#### `get_progress_above_threshold(env: Env, student: Address, min_progress_pct: u32) -> Vec<ProgressRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve courses where student progress meets or exceeds a threshold.

**Parameters:**
- `student: Address` — The student's Stellar address
- `min_progress_pct: u32` — Minimum progress percentage (0–100)

**Returns:** Vector of `ProgressRecord` meeting the threshold

**Errors:**
- Panics if `min_progress_pct > 100`

**Example:**
```bash
# Get courses where student has at least 50% progress
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_progress_above_threshold \
  --student <STUDENT_ADDRESS> \
  --min-progress-pct 50
```

---

#### `count_completed_courses(env: Env, student: Address) -> u32`
**Auth Required:** None (read-only)  
**Purpose:** Get the total number of completed courses for a student.

**Parameters:**
- `student: Address` — The student's Stellar address

**Returns:** Number of courses with 100% completion

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- count_completed_courses \
  --student <STUDENT_ADDRESS>
```

---

#### `get_average_progress(env: Env, student: Address) -> u32`
**Auth Required:** None (read-only)  
**Purpose:** Calculate average progress across all student's courses.

**Parameters:**
- `student: Address` — The student's Stellar address

**Returns:** Average progress percentage (0–100); returns 0 if no courses

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_average_progress \
  --student <STUDENT_ADDRESS>
```

---

### Milestone Functions

#### `get_milestone(env: Env, student: Address, course_id: Symbol, milestone_pct: u32) -> Option<MilestoneRecord>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve a specific milestone achievement record.

**Parameters:**
- `student: Address` — The student's Stellar address
- `course_id: Symbol` — The course identifier
- `milestone_pct: u32` — The milestone percentage (25, 50, 75, or 100)

**Returns:** `Some(MilestoneRecord)` if milestone was achieved, `None` otherwise

**Side Effect:** Extends TTL of the record on read

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_milestone \
  --student <STUDENT_ADDRESS> \
  --course-id "RUST101" \
  --milestone-pct 75
```

---

#### `get_achieved_milestones(env: Env, student: Address, course_id: Symbol) -> Vec<u32>`
**Auth Required:** None (read-only)  
**Purpose:** List all milestones achieved by a student in a specific course.

**Parameters:**
- `student: Address` — The student's Stellar address
- `course_id: Symbol` — The course identifier

**Returns:** Vector of milestone percentages (e.g., `[25, 50, 75]`)

**Side Effect:** Extends TTL of the record on read

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_achieved_milestones \
  --student <STUDENT_ADDRESS> \
  --course-id "PYTHON202"
```

**Example Output:**
```
[25, 50, 75, 100]
```

---

### Analytics & Aggregation Functions

#### `get_total_students(env: Env) -> u32`
**Auth Required:** None (read-only)  
**Purpose:** Get cumulative count of unique students who have enrolled.

**Returns:** Total unique student count

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_total_students
```

---

#### `get_total_courses(env: Env) -> u32`
**Auth Required:** None (read-only)  
**Purpose:** Get cumulative count of unique courses tracked.

**Returns:** Total unique course count

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_total_courses
```

---

#### `get_completion_stats(env: Env) -> CompletionStats`
**Auth Required:** None (read-only)  
**Purpose:** Get platform-wide completion statistics.

**Returns:**
```rust
CompletionStats {
    total_completions: u32,    // Total courses completed across all students
    avg_completion_rate: u32,  // Average completion percentage (0–100)
}
```

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_completion_stats
```

---

#### `get_daily_stats(env: Env, day: u64) -> Option<TimeBasedStats>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve daily aggregated statistics for a specific day.

**Parameters:**
- `day: u64` — Day identifier (typically: `timestamp / 86400`)

**Returns:** `Some(TimeBasedStats)` if stats exist for day, `None` otherwise

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_daily_stats \
  --day 19571  # July 29, 2026
```

---

#### `get_weekly_stats(env: Env, week: u64) -> Option<TimeBasedStats>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve weekly aggregated statistics.

**Parameters:**
- `week: u64` — Week identifier (typically: `timestamp / 604800`)

**Returns:** `Some(TimeBasedStats)` if stats exist, `None` otherwise

---

#### `get_monthly_stats(env: Env, month: u64) -> Option<TimeBasedStats>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve monthly aggregated statistics.

**Parameters:**
- `month: u64` — Month identifier

**Returns:** `Some(TimeBasedStats)` if stats exist, `None` otherwise

---

#### `get_top_performers(env: Env, limit: u32) -> Vec<TopPerformer>`
**Auth Required:** None (read-only)  
**Purpose:** Retrieve the top N students by completion count.

**Parameters:**
- `limit: u32` — Maximum number of top performers to return

**Returns:** Vector of `TopPerformer` sorted by completion count (descending)

**Example:**
```bash
# Get top 10 students
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ANY_KEY> \
  -- get_top_performers \
  --limit 10
```

**Example Output:**
```json
[
  {
    "student": "GBBD....",
    "completion_count": 15,
    "avg_progress": 92
  },
  {
    "student": "GAAA....",
    "completion_count": 12,
    "avg_progress": 87
  }
]
```

---

#### `update_aggregates(env: Env, admin: Address)`
**Auth Required:** `admin` must authorize and match stored admin  
**Purpose:** Admin-triggered aggregation of completion stats and leaderboard updates. This function is called off-chain via a cron job or indexer to refresh platform-wide statistics.

**Parameters:**
- `admin: Address` — The admin address performing the update

**Errors:**
- Panics if `admin` does not authorize
- Panics if `admin` is not the stored admin address

**Side Effects:**
- Updates `CompletionStats` with current total completions and average rate
- Emits `("analytics", "agg_upd")` event with total completions count

**Example:**
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_KEY> \
  -- update_aggregates \
  --admin <ADMIN_ADDRESS>
```

---

## Access Control Summary

| Function | Public | Student | Admin | Notes |
|---|---|---|---|---|
| `initialize` | ✅ auth required | — | — | Can only be called once |
| `set_admin` | ✅ auth required | ❌ | ✅ | Current admin only |
| `get_admin` | ✅ read-only | ✅ | ✅ | No auth needed |
| `record_progress` | ✅ auth required | ✅ own only | ✅ any | Caller = student \| admin |
| `reset_progress` | ❌ admin-only | ❌ | ✅ | Admin only, destructive |
| `get_progress` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_all_progress` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_completed_courses` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_in_progress_courses` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_progress_paginated` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_progress_above_threshold` | ✅ read-only | ✅ | ✅ | No auth needed |
| `count_completed_courses` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_average_progress` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_milestone` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_achieved_milestones` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_total_students` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_total_courses` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_completion_stats` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_daily_stats` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_weekly_stats` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_monthly_stats` | ✅ read-only | ✅ | ✅ | No auth needed |
| `get_top_performers` | ✅ read-only | ✅ | ✅ | No auth needed |
| `update_aggregates` | ❌ admin-only | ❌ | ✅ | Admin only |

---

## Events

All events are published by the contract and can be subscribed to via Stellar's Horizon API or other Soroban indexers.

### `("analytics", "prog_upd")`

**Emitted:** On every `record_progress` call, regardless of percentage change.

**Topics:**
```
topic[0]: Symbol("analytics")
topic[1]: Symbol("prog_upd")
```

**Data:**
```
(student: Address, course_id: Symbol, progress_pct: u32)
```

**Example Event Subscription (via Horizon):**
```bash
curl "https://horizon-testnet.stellar.org/accounts/<CONTRACT_ADDRESS>/transactions?limit=200" | jq '.records[] | select(.type == "invoke_host_function")'
```

---

### `("analytics", "completed")`

**Emitted:** Only when `progress_pct == 100` (course completion).

**Topics:**
```
topic[0]: Symbol("analytics")
topic[1]: Symbol("completed")
```

**Data:**
```
(student: Address, course_id: Symbol)
```

**Use Case:** Trigger credential issuance or token rewards when students complete courses.

---

### `("analytics", "milestone")`

**Emitted:** When a student reaches a new milestone (25%, 50%, 75%, or 100%).

**Topics:**
```
topic[0]: Symbol("analytics")
topic[1]: Symbol("milestone")
```

**Data:**
```
(student: Address, course_id: Symbol, milestone_pct: u32)
```

**Use Case:** Award achievements or badges at milestone thresholds.

---

### `("analytics", "agg_upd")`

**Emitted:** On `update_aggregates` call by admin.

**Topics:**
```
topic[0]: Symbol("analytics")
topic[1]: Symbol("agg_upd")
```

**Data:**
```
total_completions: u32
```

---

## CLI Invocation Examples

### Prerequisites

Ensure you have:
- Stellar CLI installed (`stellar` or `soroban` CLI)
- Contract ID for the deployed analytics contract
- At least one funded Stellar testnet account (source key)
- Environment variables set:
  ```bash
  export SOROBAN_RPC_HOST=https://soroban-testnet.stellar.org
  export SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
  ```

### Example 1: Initialize the Contract

```bash
# Variables
CONTRACT_ID="CABC..." 
ADMIN_KEY="SCDE..."
ADMIN_ADDRESS="GABC..."

# Initialize with admin
soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account $ADMIN_KEY \
  --source $ADMIN_KEY \
  -- initialize \
  --admin $ADMIN_ADDRESS
```

### Example 2: Student Records Progress (75%)

```bash
CONTRACT_ID="CABC..."
STUDENT_KEY="SCDE..."
STUDENT_ADDRESS="GABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account $STUDENT_KEY \
  --source $STUDENT_KEY \
  -- record_progress \
  --caller $STUDENT_ADDRESS \
  --student $STUDENT_ADDRESS \
  --course-id "RUST101" \
  --progress-pct 75
```

**Expected Output:**
```
✓ Transaction successful. Event emitted: ("analytics", "prog_upd")
```

### Example 3: Trigger Course Completion Event

```bash
CONTRACT_ID="CABC..."
STUDENT_KEY="SCDE..."
STUDENT_ADDRESS="GABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account $STUDENT_KEY \
  --source $STUDENT_KEY \
  -- record_progress \
  --caller $STUDENT_ADDRESS \
  --student $STUDENT_ADDRESS \
  --course-id "RUST101" \
  --progress-pct 100
```

**Expected Events:**
- `("analytics", "prog_upd")` → (GABC..., "RUST101", 100)
- `("analytics", "completed")` → (GABC..., "RUST101")
- `("analytics", "milestone")` → (GABC..., "RUST101", 100)

---

### Example 4: Query Student Progress

```bash
CONTRACT_ID="CABC..."
STUDENT_ADDRESS="GABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account <ANY_KEY> \
  -- get_progress \
  --student $STUDENT_ADDRESS \
  --course-id "RUST101"
```

**Response:**
```json
{
  "student": "GABC...",
  "course_id": "RUST101",
  "progress_pct": 100,
  "completed": true,
  "timestamp": 1690000500
}
```

---

### Example 5: Retrieve All Student Progress

```bash
CONTRACT_ID="CABC..."
STUDENT_ADDRESS="GABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account <ANY_KEY> \
  -- get_all_progress \
  --student $STUDENT_ADDRESS
```

**Response:**
```json
[
  {
    "student": "GABC...",
    "course_id": "RUST101",
    "progress_pct": 100,
    "completed": true,
    "timestamp": 1690000500
  },
  {
    "student": "GABC...",
    "course_id": "PYTHON202",
    "progress_pct": 50,
    "completed": false,
    "timestamp": 1689999000
  }
]
```

---

### Example 6: Get Completed Courses

```bash
CONTRACT_ID="CABC..."
STUDENT_ADDRESS="GABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account <ANY_KEY> \
  -- get_completed_courses \
  --student $STUDENT_ADDRESS
```

**Response:**
```json
[
  {
    "student": "GABC...",
    "course_id": "RUST101",
    "progress_pct": 100,
    "completed": true,
    "timestamp": 1690000500
  }
]
```

---

### Example 7: Get Top Performers

```bash
CONTRACT_ID="CABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account <ANY_KEY> \
  -- get_top_performers \
  --limit 5
```

**Response:**
```json
[
  {
    "student": "GABC...",
    "completion_count": 8,
    "avg_progress": 95
  },
  {
    "student": "GDEF...",
    "completion_count": 6,
    "avg_progress": 88
  },
  {
    "student": "GHIJ...",
    "completion_count": 5,
    "avg_progress": 92
  }
]
```

---

### Example 8: Admin Resets Student Progress

```bash
CONTRACT_ID="CABC..."
ADMIN_KEY="SCDE..."
ADMIN_ADDRESS="GABC..."
STUDENT_ADDRESS="GHIJ..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account $ADMIN_KEY \
  --source $ADMIN_KEY \
  -- reset_progress \
  --admin $ADMIN_ADDRESS \
  --student $STUDENT_ADDRESS \
  --course-id "RUST101"
```

**Note:** After reset, `get_progress` will return `None` for that student/course.

---

### Example 9: Get Average Progress for Student

```bash
CONTRACT_ID="CABC..."
STUDENT_ADDRESS="GABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account <ANY_KEY> \
  -- get_average_progress \
  --student $STUDENT_ADDRESS
```

**Response:**
```
75
```

---

### Example 10: Get Platform-Wide Completion Stats

```bash
CONTRACT_ID="CABC..."

soroban contract invoke \
  --id $CONTRACT_ID \
  --source-account <ANY_KEY> \
  -- get_completion_stats
```

**Response:**
```json
{
  "total_completions": 42,
  "avg_completion_rate": 82
}
```

---

## Integration with Backend & Frontend

### Backend Integration (NestJS)

When a student completes a module quiz, the backend calls the analytics contract:

```typescript
// backend/src/courses/courses.service.ts
async recordProgress(studentAddress: string, courseId: string, progressPct: number) {
  const tx = await this.stellarService.invoke({
    contractId: process.env.ANALYTICS_CONTRACT_ID,
    method: 'record_progress',
    params: {
      caller: adminAddress,
      student: studentAddress,
      course_id: courseId,
      progress_pct: progressPct,
    },
  });
  return tx.hash;
}
```

### Frontend Integration (Next.js)

Query student's progress from the dApp:

```typescript
// frontend/src/components/ProgressDashboard.tsx
async function loadStudentProgress(studentAddress: string) {
  const progress = await contractClient.invoke({
    method: 'get_all_progress',
    params: { student: studentAddress },
  });
  return progress;
}
```

---

## Storage & TTL Management

### TTL (Time-To-Live) Behavior

- **Persistent records** are extended automatically on every read and write operation
- **TTL Threshold:** 100 ledgers (~8 minutes, assuming 5-second block time)
- **TTL Extension:** Records are extended to 500 ledgers (~40 minutes) on access
- **Admin records** (milestones, stats) are stored in instance storage (no TTL expiration)

### TTL Implications

- Inactive student progress records will expire after ~40 minutes of no access
- Milestone records are **permanent** (stored in instance storage, cannot expire)
- Stats aggregates are **permanent**

---

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|---|---|---|
| `Already initialized` | `initialize()` called twice | Can only initialize once per contract |
| `Unauthorized: must be student or admin` | Non-student, non-admin calls `record_progress` | Only the student or admin can record progress |
| `Progress must be 0-100` | `progress_pct > 100` or negative | Validate input before calling; use 0–100 range |
| `Only admin can reset progress` | Non-admin calls `reset_progress` | Only the admin address can reset progress |
| `Only admin can update aggregates` | Non-admin calls `update_aggregates` | Only the admin address can trigger aggregation |

---

## Testing

Run the test suite:

```bash
cd contracts/analytics
cargo test
```

Run fuzz tests (property-based testing):

```bash
cargo test fuzz_
```

---

## References

- [Soroban SDK Documentation](https://soroban.stellar.org)
- [Stellar Network Documentation](https://developers.stellar.org)
- [Soroban Events](https://soroban.stellar.org/docs/learn/storing-data#events)
- [Soroban Contract Auth](https://soroban.stellar.org/docs/learn/invoking-contracts#authorization)

