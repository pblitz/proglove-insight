# ProGlove INSIGHT Skill for OpenClaw

Direct integration with ProGlove INSIGHT API for device management and analytics. Built as an [OpenClaw AgentSkill](https://docs.openclaw.ai/skills).

## Features

- ✅ Username/password authentication with long-lived RefreshTokens
- ✅ Auto-token refresh (tokens expire after 1h)
- ✅ Direct API access without MCP server overhead
- ✅ Query devices, worker analytics, and scan data
- ✅ Auto-triggers when asking about ProGlove devices

## Installation

```bash
cd ~/.openclaw/skills
git clone https://github.com/YOUR-USERNAME/proglove-insight.git
```

## Setup

### 1. Authenticate

```bash
cd ~/.openclaw/skills/proglove-insight

CUSTOMER_ID=your-customer-id \
USERNAME=your-email@example.com \
PASSWORD=your-password \
node scripts/auth.js
```

This creates `~/.proglove-tokens.json` with:
- `IdToken` (1h validity)
- `RefreshToken` (long-lived, auto-refreshes)
- Base URL for your customer

### 2. Verify

```bash
node scripts/insight-api.js devices/status
```

## Usage

### Command Line

```bash
# List all devices
node scripts/insight-api.js devices

# Get device details
node scripts/insight-api.js devices/abc123

# Worker analytics
node scripts/insight-api.js analytics/workers

# Custom endpoint with POST
node scripts/insight-api.js devices --method POST --body '{"name":"Scanner1"}'
```

### With OpenClaw

Just ask naturally:

- "How many ProGlove devices are online?"
- "Show me worker productivity stats"
- "List all scanners"

The skill auto-triggers and handles API calls + token refresh.

## API Endpoints

See [`references/api-endpoints.md`](references/api-endpoints.md) for full API documentation.

Common endpoints:
- `GET /devices` - List all devices
- `GET /devices/{id}` - Device details
- `GET /devices/status` - Online/offline counts
- `GET /analytics/workers` - Worker productivity
- `GET /analytics/scans` - Scan metrics

## Token Management

Tokens auto-refresh when expired. Manual refresh:

```bash
node scripts/auth.js
```

Token file (`~/.proglove-tokens.json`) contains:
```json
{
  "customerId": "...",
  "baseUrl": "https://...",
  "IdToken": "...",
  "RefreshToken": "...",
  "expiresAt": 1776291600000,
  "region": "eu-west-1",
  "clientId": "..."
}
```

## Files

```
proglove-insight/
├── SKILL.md                    # Skill metadata + OpenClaw instructions
├── README.md                   # This file
├── scripts/
│   ├── auth.js                 # Authentication + token refresh
│   └── insight-api.js          # API wrapper with auto-refresh
└── references/
    └── api-endpoints.md        # API documentation
```

## Authentication Flow

Based on [ProGlove Authentication Docs](https://docs.proglove.com/en/authentication.html):

1. **Get customer API URL**: `GET /customers/{customerId}`
2. **Get auth info**: `GET /auth-information?id={customerId}`
3. **Login**: POST to AWS Cognito with username/password
4. **Store tokens**: IdToken (1h) + RefreshToken (long-lived)
5. **Auto-refresh**: When IdToken expires, use RefreshToken to get new IdToken

## Requirements

- Node.js (built-in `https` module, no dependencies)
- ProGlove INSIGHT account
- OpenClaw (optional, works standalone too)

## License

MIT

## Contributing

PRs welcome! This skill was built to bypass the broken insight-mcp OAuth flow and provide a simpler, more reliable integration.
