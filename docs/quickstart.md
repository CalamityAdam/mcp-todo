# Quick Start Guide

Get up and running with MCP Todo Discord Edition in under 10 minutes.

## Local Development Setup

### 1. Prerequisites
- Node.js 20+ installed
- Discord account with a server where you have admin rights
- OpenAI API key

### 2. Clone and Install

```bash
git clone <repository-url>
cd mcp-todo
npm install
```

### 3. Discord Bot Setup (2 minutes)

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it → Create
3. Go to "Bot" section → Reset Token → Copy token
4. From "General Information" → Copy Application ID
5. Go to "OAuth2" → "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Read Message History`
   - Copy URL → Open in browser → Add to your server

### 4. Environment Configuration (1 minute)

```bash
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=<bot token from step 3>
DISCORD_CLIENT_ID=<application id from step 3>
DISCORD_GUILD_ID=<right-click your server, copy ID>
OPENAI_API_KEY=<your openai key>
MCP_URL=http://localhost:3000/mcp
TODO_MCP_TOKEN=dev-secret-token
DATA_DIR=./data
```

### 5. Build and Start (1 minute)

```bash
npm run build
npm run discord:register:dev
npm run dev
```

### 6. Test It Out!

In your Discord server:
- `/todo add Pack kitchen items`
- `/todo list`
- `/todo toggle 1`
- `/todo note 1 Don't forget the fragile dishes`

## Production Deployment (Fly.io)

### 1. Initial Setup (5 minutes)

Install Fly CLI and login:
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create App and Volume

```bash
fly apps create your-app-name
fly volumes create mcp_todo_data --size 1 --region iad
```

### 3. Set Secrets

```bash
fly secrets set \
  DISCORD_TOKEN="your-bot-token" \
  DISCORD_CLIENT_ID="your-app-id" \
  OPENAI_API_KEY="your-openai-key" \
  MCP_URL="https://your-app-name.fly.dev/mcp" \
  TODO_MCP_TOKEN="generate-secure-token" \
  DATA_DIR="/data"
```

### 4. Deploy

```bash
fly deploy
```

### 5. Register Commands Globally

On your local machine:
```bash
npm run discord:register:global
```

Wait up to 1 hour for global commands to appear.

## Quick Commands Reference

### NPM Scripts
- `npm run dev` - Start local server
- `npm run build` - Build TypeScript
- `npm run discord:register:dev` - Register commands to dev server
- `npm run discord:register:global` - Register commands globally

### Discord Commands
- `/todo add <title>` - Create task
- `/todo list` - Show all tasks
- `/todo toggle <id>` - Mark done/undone
- `/todo note <id> <note>` - Add note
- `/todo remove <id>` - Delete task

### Fly.io Commands
- `fly deploy` - Deploy updates
- `fly logs` - View logs
- `fly secrets list` - List configured secrets
- `fly ssh console` - SSH into container

## Common Issues

### Bot offline in Discord
- Check `DISCORD_TOKEN` is correct
- Verify `fly logs` shows "Discord bot logged in"

### Commands not showing
- For dev: Ensure `DISCORD_GUILD_ID` is set
- For prod: Wait up to 1 hour after global registration
- Try restarting Discord client

### Tasks not persisting
- Check `DATA_DIR` is set to `/data` in production
- Verify volume is mounted in fly.toml

## Next Steps

- Read the [full deployment guide](deployment.md) for detailed instructions
- Check the [architecture summary](summary.md) to understand the system
- Share the [family guide](one-sheet-for-family.md) with other users