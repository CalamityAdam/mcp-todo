# MCP Todo SMS App - Deployment Guide

## Prerequisites

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Authenticate with Fly:
   ```bash
   flyctl auth login
   ```

## Deployment Steps

### 1. Configure Environment

Update the app name in `fly.toml` if needed.

### 2. Run Deployment Script

```bash
./deploy.sh
```

The script will:
- Build the application
- Create/update the Fly app
- Create a persistent volume for data
- Prompt you to set secrets
- Deploy the application

### 3. Set Secrets

Set the required environment variables:

```bash
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl secrets set TODO_MCP_TOKEN=your-secret-token
flyctl secrets set TWILIO_ACCOUNT_SID=AC...
flyctl secrets set TWILIO_AUTH_TOKEN=...
flyctl secrets set TWILIO_MESSAGING_SERVICE_SID=MG...
flyctl secrets set ALLOWED_SMS_FROM="+1234567890,+0987654321"
flyctl secrets set PUBLIC_BASE_URL="https://your-app.fly.dev"
```

### 4. Configure Twilio

In your Twilio Console:
1. Go to Phone Numbers > Manage > Active Numbers
2. Select your phone number
3. In the Messaging section, set the webhook URL to:
   ```
   https://your-app.fly.dev/twilio/sms
   ```
4. Set the HTTP method to `POST`
5. Save the configuration

## Testing

Send an SMS to your Twilio number with commands like:
- "add task to pack kitchen items"
- "list open tasks"
- "add note to task 1: fragile items need bubble wrap"

## Monitoring

View logs:
```bash
flyctl logs
```

Check app status:
```bash
flyctl status
```

SSH into the app:
```bash
flyctl ssh console
```

## Persistent Data

The app stores todos in `/data/.mcp-todos.json` which is persisted in a Fly volume.

To backup data:
```bash
flyctl ssh console -C "cat /data/.mcp-todos.json" > backup-todos.json
```