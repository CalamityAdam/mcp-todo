# feat: SMS-based AI todo assistant with MCP integration

## Overview

This PR implements a comprehensive SMS-based todo list manager that integrates Model Context Protocol (MCP), Twilio for SMS communication, and OpenAI for natural language processing.

## Features Added

### 1. Extended Data Model ✅
- Added timestamps (`createdAt`, `updatedAt`) to todos
- Added `createdBy` field to track phone number of creator
- Added `notes` array for additional context on tasks
- Implemented atomic writes (write to temp file then rename) to prevent corruption
- Backfill defaults for existing records

### 2. New MCP Tools ✅
- `add_note_to_todo`: Append notes to existing todos
- `list_open_todos`: Filter and return only incomplete tasks
- `update_title`: Modify todo titles
- All tools return structured content for better API integration

### 3. Twilio Integration ✅
- Webhook endpoint at `/twilio/sms` with signature validation
- Fast TwiML acknowledgment to prevent timeouts
- Async processing of SMS commands
- Support for both phone numbers and messaging services
- Mock SMS mode for development

### 4. AI Orchestrator ✅
- OpenAI function calling for natural language understanding
- Fallback command parser for testing without API key
- Automatic `createdBy` tracking from sender's phone number
- Support for commands like:
  - "add task to pack kitchen items"
  - "list open tasks"
  - "add note to task 3: fragile items need bubble wrap"

### 5. Production Deployment ✅
- Dockerfile with multi-stage build
- Fly.io configuration with persistent volume
- Deployment script and documentation
- Environment-based configuration
- Health checks and monitoring

## Technical Details

### Architecture
- **MCP Server**: Extended with new tools and schema
- **HTTP Server**: Express with MCP HTTP transport
- **Twilio Handler**: Webhook validation and SMS sending
- **AI Orchestrator**: OpenAI integration with fallback parser

### Security
- Bearer token authentication for MCP endpoints
- Twilio webhook signature validation
- Phone number whitelist (`ALLOWED_SMS_FROM`)
- Environment variable configuration

### Data Persistence
- JSON file storage with atomic writes
- Fly.io volume mount at `/data` for production
- Automatic directory creation

## Testing

The implementation has been tested with:
- Direct orchestrator testing
- SMS webhook simulation
- Error handling scenarios
- Persistence across restarts

## Deployment Instructions

1. Set environment variables in `.env`:
   - `OPENAI_API_KEY`
   - `TODO_MCP_TOKEN`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER`
   - `ALLOWED_SMS_FROM`
   - `PUBLIC_BASE_URL`

2. Deploy to Fly.io:
   ```bash
   ./deploy.sh
   ```

3. Configure Twilio webhook to `https://your-app.fly.dev/twilio/sms`

## Files Changed

- **New files**:
  - `src/ai/orchestrator.ts` - AI orchestration logic
  - `src/twilio.ts` - Twilio integration
  - `Dockerfile` - Container configuration
  - `fly.toml` - Fly.io deployment config
  - `deploy.sh` - Deployment script
  - Documentation files

- **Modified files**:
  - `src/server.ts` - Extended data model and new tools
  - `src/http.ts` - Added Twilio webhook route
  - `package.json` - Added dependencies
  - `.env` - Configuration template

## Breaking Changes

None - the existing MCP functionality remains intact.

## Future Enhancements

- Per-person todo filtering using `createdBy`
- Due dates and reminders
- Categories/tags for tasks
- Voice call integration

## Checklist

- [x] Code builds without errors
- [x] Tests pass (manual testing completed)
- [x] Documentation updated
- [x] Environment variables documented
- [x] Deployment configuration included
- [x] Security considerations addressed