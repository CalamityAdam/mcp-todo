# WhatsApp Setup Guide

## Why WhatsApp Instead of SMS?

Twilio requires A2P (Application-to-Person) 10DLC registration for sending SMS messages to US phone numbers. This process can take weeks and requires business verification. WhatsApp provides an alternative that doesn't require A2P registration.

## Quick Start with Twilio WhatsApp Sandbox

### 1. Join the Sandbox

1. Go to Twilio Console > Messaging > Try it out > Send a WhatsApp message
2. Follow the instructions to join your sandbox:
   - Send a WhatsApp message to **+1 415 523 8886**
   - The message should be: `join <your-sandbox-code>`
   - You'll receive a confirmation message

### 2. Configure the Webhook

1. In the Twilio Console, go to WhatsApp Sandbox Settings
2. Set the webhook URL for incoming messages:
   ```
   https://your-app.fly.dev/twilio/whatsapp
   ```
3. Set the HTTP method to `POST`
4. Save the configuration

### 3. Test Locally

```bash
# Start the server
npm run dev

# Test with the provided script
node test-whatsapp.js "add task to pack books"
```

### 4. Environment Variables

Update your `.env` file:

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token

# WhatsApp Configuration
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox number
ALLOWED_WHATSAPP_FROM="+1234567890,+0987654321"  # Allowed phone numbers

# Other settings
OPENAI_API_KEY=your-openai-key  # Optional
TODO_MCP_TOKEN=your-secret-token
DATA_DIR=/data
PUBLIC_BASE_URL=https://your-app.fly.dev
MCP_STDIO=0
```

## Usage Examples

Send WhatsApp messages to your Twilio WhatsApp number:

- **Add a task**: "add task to schedule movers"
- **List open tasks**: "list open tasks"
- **Add a note**: "add note to task 1: call between 9am-5pm"
- **Mark as done**: "mark task 1 as done"
- **Update title**: "update task 1 title to schedule ABC Moving Company"

## Production Setup

### 1. Register for WhatsApp Business API

1. Apply for WhatsApp Business API access through Twilio
2. Submit your business information for verification
3. Wait for approval (usually 1-2 business days)

### 2. Get a Dedicated WhatsApp Number

1. Once approved, request a WhatsApp-enabled phone number
2. Update `TWILIO_WHATSAPP_NUMBER` in your environment

### 3. Create Message Templates

For sending proactive messages (outside the 24-hour window):
1. Create message templates in Twilio Console
2. Submit for WhatsApp approval
3. Use approved templates for notifications

## Advantages of WhatsApp

1. **No A2P Registration**: Avoid the complex 10DLC registration process
2. **Global Reach**: Works internationally without additional setup
3. **Rich Media**: Support for images, documents, and location sharing (future enhancement)
4. **Read Receipts**: Know when messages are delivered and read
5. **Encryption**: End-to-end encryption for security

## Limitations

1. **Sandbox Limitations**: 
   - Users must join sandbox with a code
   - Messages may include sandbox branding
   - Limited to testing purposes

2. **24-Hour Window**: 
   - Can only send freeform messages within 24 hours of user interaction
   - Must use approved templates for messages outside this window

3. **Approval Process**: 
   - Production setup requires business verification
   - Message templates need WhatsApp approval