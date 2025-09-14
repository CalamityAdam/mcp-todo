# Deployment Guide

This guide covers setting up the Discord bot and deploying to Fly.io with persistent storage.

## Discord Developer Portal Setup

### 1. Create a Discord Application

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter a name (e.g., "MCP Todo Bot")
4. Click "Create"

### 2. Configure Bot Settings

1. Navigate to the "Bot" section in the left sidebar
2. Click "Reset Token" and copy the token - this is your `DISCORD_TOKEN`
3. Under "Privileged Gateway Intents", ensure no special intents are needed (default is fine)
4. Save the Application ID from "General Information" - this is your `DISCORD_CLIENT_ID`

### 3. Generate Bot Invite Link

1. Go to "OAuth2" → "URL Generator"
2. Under "Scopes", select:
   - `bot`
   - `applications.commands`
3. Under "Bot Permissions", select:
   - Send Messages
   - Read Message History
4. Copy the generated URL at the bottom

### 4. Add Bot to Your Server

1. Open the invite URL in your browser
2. Select your Discord server
3. Click "Authorize"
4. Complete the captcha if prompted

### 5. Get Your Guild ID (for development)

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your server name
3. Click "Copy Server ID" - this is your `DISCORD_GUILD_ID`

### 6. Register Slash Commands

For development (instant updates):
```bash
npm run discord:register:dev
```

For production (may take up to 1 hour):
```bash
npm run discord:register:global
```

## Fly.io Deployment

### Prerequisites

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Sign up/login: `fly auth login`

### 1. Create Fly App

```bash
fly apps create mcp-todo-discord
```

### 2. Create Persistent Volume

```bash
fly volumes create mcp_todo_data --size 1 --region iad
```

### 3. Set Environment Secrets

Set all required secrets:

```bash
fly secrets set DISCORD_TOKEN="your_discord_bot_token"
fly secrets set DISCORD_CLIENT_ID="your_discord_app_id"
fly secrets set OPENAI_API_KEY="your_openai_api_key"
fly secrets set MCP_URL="https://mcp-todo-discord.fly.dev/mcp"
fly secrets set TODO_MCP_TOKEN="generate_a_secure_random_token"
fly secrets set DATA_DIR="/data"
```

Optional for development deployments:
```bash
fly secrets set DISCORD_GUILD_ID="your_dev_server_id"
```

### 4. Deploy the Application

```bash
fly deploy
```

### 5. Verify Deployment

Check logs to ensure both HTTP server and Discord bot started:
```bash
fly logs
```

You should see:
- "MCP Streamable HTTP listening on..."
- "Discord bot logged in as..."

### 6. Register Commands (if not done locally)

If you haven't registered commands globally yet:

1. SSH into your Fly app:
   ```bash
   fly ssh console
   ```

2. Register commands:
   ```bash
   cd /app
   node dist/discord/register-commands.js
   ```

3. Exit SSH:
   ```bash
   exit
   ```

## Troubleshooting

### Bot Not Responding to Commands

1. **Check bot is online**: Bot should show as online in Discord
2. **Verify command registration**: Commands should appear when typing `/` in Discord
3. **Check logs**: `fly logs` for any error messages
4. **Ensure environment variables are set**: `fly secrets list`

### Command Registration Issues

- **"Missing Access"**: Bot lacks permissions in the server
- **"Invalid Form Body"**: Check DISCORD_CLIENT_ID is correct
- **Commands not appearing**: 
  - For global commands, wait up to 1 hour
  - For guild commands, ensure DISCORD_GUILD_ID is correct
  - Try restarting Discord client

### MCP Connection Issues

1. **401 Unauthorized**: TODO_MCP_TOKEN mismatch between orchestrator and server
2. **Connection refused**: Ensure MCP_URL is correct and HTTPS
3. **Timeout errors**: Check Fly app is running and healthy

### Data Persistence Issues

1. **Tasks disappear on restart**: 
   - Verify volume is mounted: Check fly.toml `[mounts]` section
   - Ensure DATA_DIR environment variable is set to `/data`
2. **Permission errors**: 
   - Dockerfile should create `/data` directory
   - Check file ownership in container

## Security Considerations

1. **Never commit tokens**: Use environment variables and secrets
2. **Rotate tokens regularly**: Especially if exposed
3. **Use strong MCP tokens**: Generate with `openssl rand -hex 32`
4. **Limit bot permissions**: Only grant necessary Discord permissions
5. **Monitor usage**: Check OpenAI usage to prevent unexpected costs

## Updating the Deployment

To deploy updates:

1. Make your code changes
2. Commit to git (optional but recommended)
3. Run `fly deploy`
4. If you updated commands, re-run registration scripts

## Rollback Procedure

If issues occur after deployment:

1. View deployment history: `fly releases`
2. Rollback to previous version: `fly deploy --image registry.fly.io/mcp-todo-discord:deployment-<id>`
3. Investigate issues in rolled-back version before re-deploying