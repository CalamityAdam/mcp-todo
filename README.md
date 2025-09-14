# MCP Todo SMS App

A SMS-based todo list manager that combines Model Context Protocol (MCP) with Twilio for SMS communication and OpenAI for natural language processing.

## Quick Start

```bash
npm install

# For HTTP server (default)
npm run dev
```

## Setup

```bash
npm install
npm run build
```

## Usage

### HTTP Transport

For HTTP-based access with session management:

```bash
npm run dev  # Starts HTTP server on port 3000
```

The server exposes endpoints:
- `POST /mcp` - JSON-RPC requests
- `GET /mcp` - SSE stream for server notifications  
- `DELETE /mcp` - End session
- `GET /health` - Health check endpoint (no auth required)
- `POST /twilio/sms` - Twilio SMS webhook endpoint

#### Authentication

Set `TODO_MCP_TOKEN` environment variable to enable bearer token authentication:

```bash
TODO_MCP_TOKEN=your-secret-token npm run dev
```

Then include in requests:
```
Authorization: Bearer your-secret-token
```

## Features

- Add todos with unique IDs
- List all todos with structured output
- Toggle todo completion status
- Remove todos by ID
- Persistent JSON storage in `~/.mcp-todos.json`
- Session-based HTTP transport with SSE support
- Optional bearer token authentication

## Available Tools

- `list_todos` - Get all todos in structured format
- `add_todo` - Add a new todo (requires title)
- `toggle_todo` - Toggle completion status (requires id)
- `remove_todo` - Delete a todo (requires id)

## Resources

- `todos://list` - JSON resource containing all todos

## Architecture

- `src/server.ts` - Core MCP server with todo logic (factory function)
- `src/http.ts` - HTTP server with Express, session management, and Twilio webhook handling
- `src/twilio.ts` - Twilio integration for SMS sending and webhook validation
- `src/ai/orchestrator.ts` - OpenAI integration for natural language processing
