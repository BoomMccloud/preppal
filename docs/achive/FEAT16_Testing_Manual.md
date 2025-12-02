# FEAT16 Phase 3.1 & 3.2 Testing Manual

## Overview

This guide will help you test the Cloudflare Worker integration with the Next.js backend. You'll verify that interview status updates and transcript submissions work correctly throughout the interview lifecycle.

**What you're testing:**
- Interview status changes from `PENDING` → `IN_PROGRESS` → `COMPLETED` (or `ERROR`)
- Transcript entries are saved to the database when an interview ends
- Timestamps are recorded correctly

**No prior knowledge required** - just follow the steps below!

---

## Prerequisites

### 1. System Requirements
- Node.js installed (version 18 or higher)
- pnpm package manager installed
- SQLite (included with the project)
- Terminal/Command Line access

### 2. Check Installation
Run these commands to verify you have the required software:

```bash
node --version    # Should show v18.x.x or higher
pnpm --version    # Should show version number
```

If you don't have pnpm, install it:
```bash
npm install -g pnpm
```

---

## Setup Instructions

### Step 1: Clone & Install Dependencies

```bash
# Navigate to the project directory
cd preppal-cloudflare-worker

# Install all dependencies
pnpm install
```

### Step 2: Configure Environment Variables

You need to set up two environment files.

#### A. Main Application (.env)

Check if `.env` exists in the root directory. If not, copy from the example:

```bash
cp .env.example .env
```

Open `.env` and ensure these variables are set:
- `DATABASE_URL` - Should point to your SQLite database
- `NEXTAUTH_SECRET` - Authentication secret
- `WORKER_SHARED_SECRET` - Secret for worker authentication (generate a random string)

#### B. Worker Variables (worker/.dev.vars)

Check if `worker/.dev.vars` exists. If not, create it:

```bash
touch worker/.dev.vars
```

Add these variables to `worker/.dev.vars`:

```bash
JWT_SECRET=your-jwt-secret-here
WORKER_SHARED_SECRET=same-as-main-env-file
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**IMPORTANT:** The `WORKER_SHARED_SECRET` must be the SAME in both `.env` and `worker/.dev.vars`!

### Step 3: Set Up Database

Initialize the database with Prisma:

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push
```

### Step 4: Start the Application

You need TWO terminal windows/tabs:

**Terminal 1 - Start Next.js Backend:**
```bash
pnpm dev
```

Wait for message: `✓ Ready on http://localhost:3000`

**Terminal 2 - Start Cloudflare Worker:**
```bash
pnpm dev:worker
```

Wait for message showing the worker is running (usually on port 8787)

---

## Running the Tests

We've created an automated test script that will verify everything for you!

### Option 1: Automated Testing (Recommended)

```bash
# From the project root
node docs/test-phase-3.js
```

The script will:
1. ✅ Verify both servers are running
2. ✅ Create a test user account
3. ✅ Create a test interview (status: PENDING)
4. ✅ Generate authentication token
5. ✅ Connect to worker via WebSocket
6. ✅ Verify status changes to IN_PROGRESS
7. ✅ Send test audio data
8. ✅ Send end request
9. ✅ Verify transcript was saved
10. ✅ Verify status changed to COMPLETED
11. ✅ Display results

**Expected Output:**
```
🧪 FEAT16 Phase 3.1 & 3.2 Test Suite
====================================

[1/10] Checking if Next.js server is running... ✅
[2/10] Checking if Cloudflare Worker is running... ✅
[3/10] Creating test user... ✅
[4/10] Creating test interview... ✅
       Interview ID: clx1234567890
       Status: PENDING
[5/10] Generating worker token... ✅
[6/10] Connecting to worker WebSocket... ✅
[7/10] Verifying status changed to IN_PROGRESS... ✅
       startedAt: 2024-01-01T12:00:00.000Z
[8/10] Sending test audio chunks... ✅
[9/10] Sending end request... ✅
[10/10] Verifying final results... ✅
       Status: COMPLETED
       endedAt: 2024-01-01T12:01:00.000Z
       Transcript entries: 2

✅ ALL TESTS PASSED!
```

### Option 2: Manual Testing

If you prefer to test manually or the script fails, follow these steps:

#### Test 1: Happy Path (Success Case)

**Step 1: Create an Interview**

Open your browser to `http://localhost:3000` and:
1. Sign in (create an account if needed)
2. Navigate to "Create Interview"
3. Fill in the interview details
4. Click "Start Interview"
5. Note the Interview ID from the URL (looks like: `/interview/clx1234567890`)

**Step 2: Verify Initial Status**

Open a database viewer or run:
```bash
pnpm db:studio
```

Navigate to the `Interview` table and find your interview:
- ✅ Status should be `PENDING`
- ✅ `startedAt` should be NULL
- ✅ `endedAt` should be NULL

**Step 3: Connect via WebSocket**

The connection happens automatically when you click "Start" in the UI. Check the browser console for connection messages.

**Step 4: Verify Status Changed to IN_PROGRESS**

Refresh the database viewer:
- ✅ Status should be `IN_PROGRESS`
- ✅ `startedAt` should have a timestamp

**Step 5: Send Audio & End Interview**

1. Grant microphone permissions if prompted
2. Speak into your microphone (say something like "Hello, this is a test")
3. Wait for AI response
4. Click "End Interview"

**Step 6: Verify Final Results**

Refresh the database viewer:

**Interview Table:**
- ✅ Status should be `COMPLETED`
- ✅ `endedAt` should have a timestamp

**TranscriptEntry Table:**
- ✅ Should have entries with your conversation
- ✅ Each entry should have: speaker ('USER' or 'AI'), content (text), timestamp

#### Test 2: Error Path (Failure Case)

**Step 1: Break the Gemini API Key**

Edit `worker/.dev.vars` and change the `GEMINI_API_KEY` to something invalid:
```bash
GEMINI_API_KEY=invalid-key-12345
```

Restart the worker (Ctrl+C and run `pnpm dev` again)

**Step 2: Create a New Interview**

Follow the same steps as Test 1 to create an interview.

**Step 3: Attempt to Connect**

Try to start the interview. The connection should fail.

**Step 4: Verify Error Status**

Check the database:
- ✅ Status should be `ERROR`
- ✅ `endedAt` should have a timestamp

**Step 5: Restore the API Key**

Change `GEMINI_API_KEY` back to the correct value and restart the worker.

---

## Troubleshooting

### Problem: "Cannot connect to database"
**Solution:** Run `pnpm db:push` to create the database tables

### Problem: "Worker not running" or "Connection refused"
**Solution:** Make sure you started the worker with `cd worker && pnpm dev`

### Problem: "Authentication failed"
**Solution:** Check that `WORKER_SHARED_SECRET` matches in both `.env` and `worker/.dev.vars`

### Problem: "Gemini connection failed"
**Solution:** Verify your `GEMINI_API_KEY` is correct in `worker/.dev.vars`

### Problem: "Port already in use"
**Solution:**
- For Next.js (port 3000): Kill the process or change the port in `package.json`
- For Worker (port 8787): Kill the process or change the port in `worker/wrangler.toml`

---

## Understanding the Results

### Interview Status Flow

```
PENDING (created)
   ↓
IN_PROGRESS (WebSocket connected, Gemini initialized)
   ↓
COMPLETED (user ended session, transcript saved)
```

OR error path:

```
PENDING (created)
   ↓
ERROR (connection failed or Gemini error)
```

### What Success Looks Like

✅ **Status Transitions:** PENDING → IN_PROGRESS → COMPLETED
✅ **Timestamps Set:** startedAt when connected, endedAt when completed
✅ **Transcript Saved:** All conversation entries in TranscriptEntry table
✅ **No Errors:** Clean console output with expected log messages

### What Failure Looks Like

❌ **Stuck in PENDING:** Worker didn't connect or update status
❌ **Status ERROR:** Gemini connection failed (check API key)
❌ **No Transcript:** submitTranscript call failed (check logs)
❌ **Missing Timestamps:** API calls didn't reach the backend

---

## Expected Log Messages

### Worker Logs (Terminal 2)

When everything works correctly, you should see:

```
WebSocket connection request for user user_123, interview clx1234567890
Gemini Live connected for interview clx1234567890
Interview clx1234567890 status updated to IN_PROGRESS
Received audio chunk: 4096 bytes
Received end request for interview clx1234567890
Transcript submitted for interview clx1234567890 (2 entries)
WebSocket closed for interview clx1234567890
```

### Backend Logs (Terminal 1)

```
[TRPC] interview.updateStatus took 45ms to execute
[TRPC] interview.submitTranscript took 123ms to execute
```

---

## Database Schema Reference

### Interview Table
```
id          String    Primary key
userId      String    User who created the interview
status      String    PENDING | IN_PROGRESS | COMPLETED | ERROR
startedAt   DateTime? Set when status becomes IN_PROGRESS
endedAt     DateTime? Set when status becomes COMPLETED or ERROR
createdAt   DateTime  When interview was created
```

### TranscriptEntry Table
```
id          String   Primary key
interviewId String   Foreign key to Interview
speaker     String   USER | AI
content     String   The spoken text
timestamp   DateTime When this was spoken
```

---

## Reporting Issues

If tests fail, please provide:

1. **Error Messages:** Copy the exact error from the console
2. **Database State:** Screenshot of the Interview table showing the problematic record
3. **Worker Logs:** Copy the last 20 lines from the worker terminal
4. **Backend Logs:** Copy the last 20 lines from the Next.js terminal
5. **Environment:** Output of `node --version` and `pnpm --version`

---

## Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:generate
pnpm db:push

# Start backend (Terminal 1)
pnpm dev

# Start worker (Terminal 2)
pnpm dev:worker

# View database
pnpm db:studio

# Run automated tests
node docs/test-phase-3.js

# Run unit tests
pnpm test
```

---

## Success Criteria

Phase 3.1 & 3.2 are considered **PASSING** when:

- ✅ Interview status updates from PENDING to IN_PROGRESS when WebSocket connects
- ✅ `startedAt` timestamp is recorded
- ✅ Interview status updates to COMPLETED when user ends session
- ✅ `endedAt` timestamp is recorded
- ✅ All transcript entries are saved to the database
- ✅ Interview status updates to ERROR when Gemini connection fails
- ✅ No errors or warnings in console output (except intentional test errors)

If all criteria pass, Phase 3.1 & 3.2 are **VERIFIED** and ready for production! 🎉
