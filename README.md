# MCP Todo

A simple todo list server built with the Model Context Protocol (MCP).

## Setup

```bash
npm install
npm run build
```

## Development

```bash
npm run dev
```

## Features

- Add todos
- List todos
- Toggle todo completion
- Remove todos
- Persistent storage in `~/.mcp-todos.json`

## MCP Integration

Configure in Cursor's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "todo-mcp": {
      "command": "npx",
      "args": ["-y", "tsx", "src/server.ts"]
    }
  }
}
```

## Available Tools

- `list_todos` - Get all todos
- `add_todo` - Add a new todo
- `toggle_todo` - Toggle completion status
- `remove_todo` - Delete a todo
