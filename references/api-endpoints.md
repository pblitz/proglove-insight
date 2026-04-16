# ProGlove INSIGHT API Endpoints

Base URL auto-discovered from customer ID via:
`https://dm4yh0zboe.execute-api.eu-west-1.amazonaws.com/latest/customers/{CUSTOMER_ID}`

All endpoints require:
- `Authorization: Bearer {IdToken}` header
- `X-Customer-ID: {customerId}` header

## Device Management

### List Devices
`GET /devices`

Response:
```json
{
  "devices": [
    {
      "id": "device-123",
      "name": "Scanner-01",
      "status": "online",
      "battery": 85,
      "lastSeen": "2026-04-16T14:00:00Z"
    }
  ]
}
```

### Get Device Details
`GET /devices/{deviceId}`

### Device Status
`GET /devices/status`

Returns online/offline counts.

## Insights & Narratives

### Get Insights/Narratives
`GET /{customer_id}/newsfeed/insights/narrative/level/{level_id}`

Returns AI-generated insights and narratives for a specific organizational level.

### Get Notifications/Alerts
`GET /{customer_id}/newsfeed/insights/narrative/notifications`

Returns live notifications and alerts across all organizational levels.

**Parameters:**
- `level_id` - Organizational level ID (use `_` for root/all levels)

**Response:**
```json
{
  "insights": [
    {
      "id": "...",
      "template": { ... },
      "sentiment": "NEUTRAL|POSITIVE|NEGATIVE",
      "status": "UPDATED|NEW|SOLVED",
      "rank": 1,
      "icon": "TIPS_NEUTRAL",
      "level_path": "_",
      "new": true,
      "saved": false,
      "solved": false
    }
  ]
}
```

**Sentiment types:**
- `NEUTRAL` - Informational
- `POSITIVE` - Good performance/improvement
- `NEGATIVE` - Issues/warnings

**Common level_id values:**
- `_` - Root level (all data)
- Specific level IDs from hierarchy

**Notifications Response:**
```json
{
  "notifications": [
    {
      "insight_id": "6dae7a41-fbca-47af-aff8-416d29923249",
      "last_notification_timestamp": 1776349225847,
      "level_path": "_#333d9d#014e54"
    }
  ]
}
```

**Fields:**
- `insight_id` - Unique identifier for the alert/notification
- `last_notification_timestamp` - Unix timestamp (ms) when notification was last triggered
- `level_path` - Organizational hierarchy path (e.g., `_#333d9d#014e54`)

## Analytics

### Worker Analytics
`GET /analytics/workers`

Returns productivity metrics per worker.

### Scan Metrics
`GET /analytics/scans`

Aggregated scan data.

### Time Range Filters

Most analytics endpoints support:
- `?from=2026-04-01T00:00:00Z`
- `?to=2026-04-16T23:59:59Z`

## Authentication Endpoints

### Get Auth Info
`GET /auth-information?id={customerId}`

Returns:
```json
{
  "region": "eu-west-1",
  "customer_id": "...",
  "user_pool_client_id": "...",
  "user_pool_id": "..."
}
```

### Login (AWS Cognito)
`POST https://cognito-idp.{region}.amazonaws.com/`

Headers:
- `Content-Type: application/x-amz-json-1.1`
- `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth`

Body:
```json
{
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "{user_pool_client_id}",
  "AuthParameters": {
    "USERNAME": "{email}",
    "PASSWORD": "{password}"
  }
}
```

### Refresh Token
Same endpoint as login, with:
```json
{
  "AuthFlow": "REFRESH_TOKEN",
  "ClientId": "{user_pool_client_id}",
  "AuthParameters": {
    "REFRESH_TOKEN": "{refresh_token}"
  }
}
```
