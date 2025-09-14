# MCP Todo — Discord Edition

A household task management system featuring a Discord bot interface, MCP (Model Context Protocol) server, and OpenAI-powered orchestration. Perfect for coordinating family moves and shared task lists.

## Features

- **Discord Slash Commands**: Manage tasks directly from Discord with intuitive `/todo` commands
- **MCP Server**: Standards-based tool interface accessible via HTTP
- **Smart Orchestration**: Natural language processing powered by OpenAI
- **Persistent Storage**: Tasks survive restarts with JSON file storage
- **Multi-Channel Support**: Use via Discord bot or direct MCP connections

## Quick Start

### Prerequisites
- Node.js 20+
- Discord account and server
- OpenAI API key
- Fly.io account (for deployment)

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Fill in your Discord bot token, OpenAI API key, and other required values

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Register Discord commands** (development guild)
   ```bash
   npm run discord:register:dev
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Try it out in Discord!**
   Use `/todo add`, `/todo list`, and other commands in your Discord server

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token from Developer Portal | Yes |
| `DISCORD_CLIENT_ID` | Discord application ID | Yes |
| `DISCORD_GUILD_ID` | Development server ID (optional for production) | No |
| `OPENAI_API_KEY` | OpenAI API key for orchestration | Yes |
| `MCP_URL` | Public HTTPS URL to the /mcp endpoint | Yes |
| `TODO_MCP_TOKEN` | Bearer token for MCP authentication | Yes |
| `DATA_DIR` | Path to persistent storage directory | Yes |
| `PORT` | HTTP server port (default: 3000) | No |

## Available Scripts

- `npm run dev` - Start development server with Discord bot
- `npm run dev:stdio` - Run MCP server in stdio mode for testing
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run discord:register:dev` - Register slash commands to development guild
- `npm run discord:register:global` - Register slash commands globally

## Documentation

- [Deployment Guide](docs/deployment.md) - Complete setup instructions for Discord and Fly.io
- [Architecture Summary](docs/summary.md) - Technical overview and data flow
- [Quick Start Guide](docs/quickstart.md) - Minimal setup steps
- [Family User Guide](docs/one-sheet-for-family.md) - Simple instructions for non-technical users

## Discord Commands

All commands use the `/todo` prefix:

- `/todo add <title>` - Create a new task
- `/todo list` - Show all remaining tasks
- `/todo toggle <id>` - Mark task as done/not done
- `/todo note <id> <note>` - Add a note to a task
- `/todo remove <id>` - Delete a task

## Architecture Overview

```
Discord User → Discord Bot → Orchestrator → MCP Client → MCP Server → JSON Storage
                                   ↓
                              OpenAI API
```

The system uses:
- Discord.js for bot interactions
- OpenAI Responses API with MCP tool for intelligent processing
- Express.js for the MCP HTTP server
- JSON file storage with configurable persistence path

## Support

For issues, questions, or contributions, please refer to the documentation or create an issue in the repository.

## License

ISC