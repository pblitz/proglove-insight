---
name: proglove-insight
description: Query ProGlove INSIGHT API for device status, worker analytics, and scan data. Use when asked about ProGlove devices, scanners, online/offline status, worker productivity, or warehouse operations data.
---

# ProGlove INSIGHT API

Direct integration with ProGlove INSIGHT API for device management and analytics.

## Setup

Credentials stored in `~/.proglove-tokens.json` (created via `scripts/auth.js`).

Required env vars (or pass to auth script):
- `CUSTOMER_ID` - ProGlove customer ID
- `USERNAME` - INSIGHT portal email
- `PASSWORD` - INSIGHT portal password

## Authentication

Auto-handles token refresh. Tokens expire after 1 hour; RefreshToken is long-lived.

First-time setup:
```bash
cd ~/.openclaw/skills/proglove-insight
CUSTOMER_ID=demo0001 USERNAME=user@example.com PASSWORD=xxx node scripts/auth.js
```

## Common Operations

**Check device status:**
```bash
node scripts/insight-api.js devices
```

**Get insights/narratives (formatted):**
```bash
node scripts/get-insights.js           # All levels
node scripts/get-insights.js 333d9d    # Specific level
```

**Get insights (raw JSON):**
```bash
node scripts/insight-api.js newsfeed/insights/narrative/level/_
node scripts/insight-api.js newsfeed/insights/narrative/level/{level_id}
```

**Get worker analytics:**
```bash
node scripts/insight-api.js analytics/workers
```

## API Endpoints

All endpoints relative to base URL (auto-discovered from customer ID).

- `GET /devices` - List all devices
- `GET /devices/{id}` - Device details
- `GET /analytics/workers` - Worker productivity
- `GET /analytics/scans` - Scan metrics

For full API reference, see `references/api-endpoints.md`.

## Token Management

Tokens auto-refresh when expired. Manual refresh:
```bash
node scripts/auth.js
```

Token stored in `~/.proglove-tokens.json` with:
- `IdToken` (1h validity)
- `RefreshToken` (long-lived)
- `expiresAt` timestamp

The script checks expiry and auto-refreshes if needed.
