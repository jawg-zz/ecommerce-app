# Cron Jobs

This directory contains scheduled background jobs for the ecommerce application.

## Jobs

### cleanup-stale-orders.ts

**Purpose:** Automatically cancel orders that remain in PENDING status for more than 15 minutes.

**Why it's needed:**
- Users may abandon checkout after initiating M-Pesa payment
- M-Pesa STK push may timeout or fail
- Prevents orders from staying in limbo indefinitely

**Frequency:** Runs every 10 minutes

**What it does:**
1. Finds all PENDING orders older than 15 minutes
2. Updates their status to CANCELLED
3. Logs the cleanup activity

**Note:** Stock is not restored because the current implementation doesn't reserve stock at order creation - stock is only reduced after successful payment.

## Running Locally

```bash
npm run cron
```

## Production

The cron service runs as a separate container in docker-compose.yml:
- Shares the same database connection as the main app
- Runs independently with automatic restart
- Logs output to Docker logs
