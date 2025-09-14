# MCP Todo WhatsApp App - Deployment Guide

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
flyctl secrets set TWILIO_WHATSAPP_NUMBER='whatsapp:+14155238886'  # Sandbox number
flyctl secrets set ALLOWED_WHATSAPP_FROM="+1234567890,+0987654321"
flyctl secrets set PUBLIC_BASE_URL="https://your-app.fly.dev"
```

### 4. Configure Twilio WhatsApp

#### For Sandbox (Development):
1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message
2. Follow instructions to join your sandbox (send join code to +1 415 523 8886)
3. In Sandbox Configuration, set the webhook URL to:
   ```
   https://your-app.fly.dev/twilio/whatsapp
   ```
4. Set the HTTP method to `POST`
5. Save the configuration

#### For Production:
1. Register your phone number for WhatsApp
2. Get WhatsApp Business API approval
3. Update TWILIO_WHATSAPP_NUMBER to your approved number

## Testing

Send a WhatsApp message to your Twilio WhatsApp number with commands like:
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

## WhatsApp Specific Notes

- **Sandbox Limitations**: The sandbox number (+1 415 523 8886) is shared and requires users to join with a code
- **24-hour Window**: You can send freeform messages within 24 hours of user interaction
- **Template Messages**: For initiating conversations after 24 hours, you need approved message templates
- **No A2P Registration**: Unlike SMS, WhatsApp doesn't require A2P 10DLC registration

To backup data:
```bash
flyctl ssh console -C "cat /data/.mcp-todos.json" > backup-todos.json
```