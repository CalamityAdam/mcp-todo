# MCP Todo

A todo list server built with the Model Context Protocol (MCP) that supports both stdio and HTTP transports.

## Setup

```bash
npm install
npm run build
```

## Usage

### Stdio Transport (MCP Client Integration)

For use with MCP clients like Cursor:

```bash
MCP_STDIO=1 npm run dev
```

Configure in Cursor's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "todo-mcp": {
      "command": "npx",
      "args": ["-y", "tsx", "src/server.ts"],
      "env": {
        "MCP_STDIO": "1"
      }
    }
  }
}
```

### HTTP Transport (Streamable HTTP)

For HTTP-based access with session management:

```bash
npm run dev  # Starts HTTP server on port 3000
```

The server exposes endpoints at `http://localhost:3000/mcp`:
- `POST /mcp` - JSON-RPC requests
- `GET /mcp` - SSE stream for server notifications
- `DELETE /mcp` - End session

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

- `src/server.ts` - Core MCP server with todo logic and stdio transport
- `src/http.ts` - HTTP transport wrapper with Express and session management
