# Architecture Summary

## Overview

The MCP Todo Discord Edition is a multi-interface task management system that combines Discord bot interactions with a Model Context Protocol (MCP) server, orchestrated through OpenAI's language models.

## System Architecture

### Component Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Discord User   │────▶│  Discord Bot    │────▶│  Orchestrator   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  JSON Storage   │◀────│   MCP Server    │◀────│  OpenAI API     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                ▲
                                │
                        ┌─────────────────┐
                        │  HTTP Clients   │
                        └─────────────────┘
```

### Key Components

#### 1. Discord Bot Module (`src/discord/bot.ts`)
- **Purpose**: Handles Discord slash command interactions
- **Responsibilities**:
  - Connects to Discord gateway
  - Listens for slash command interactions
  - Maps commands to natural language intents
  - Defers replies for async processing
  - Returns orchestrator responses to users
- **Key Features**:
  - Graceful error handling
  - Automatic reconnection
  - Proper shutdown handling

#### 2. Command Registration (`src/discord/register-commands.ts`)
- **Purpose**: Registers slash commands with Discord
- **Features**:
  - Guild-specific registration for instant updates
  - Global registration for production
  - Structured command definitions with subcommands

#### 3. Orchestrator (`src/orchestrator.ts`)
- **Purpose**: Channel-agnostic request processing
- **Flow**:
  1. Receives userId, channel, and text input
  2. Constructs OpenAI chat completion request
  3. Configures MCP tool with server URL and auth
  4. Processes tool calls iteratively
  5. Returns concise user-friendly responses
- **Key Design**: Abstracts away Discord-specific logic

#### 4. MCP Server (`src/server.ts`)
- **Purpose**: Provides tool interface for task operations
- **Tools Available**:
  - `list_todos`: Returns all tasks
  - `add_todo`: Creates new task
  - `toggle_todo`: Marks task done/undone
  - `add_note`: Appends note to task
  - `remove_todo`: Deletes task
- **Storage**: JSON file with configurable path via DATA_DIR

#### 5. HTTP Transport (`src/http.ts`)
- **Purpose**: Exposes MCP server via HTTP
- **Features**:
  - Session management
  - Bearer token authentication
  - Streamable transport for real-time updates
  - Raw request body handling (no JSON middleware)
- **Integration**: Starts Discord bot alongside HTTP server

### Data Flow

1. **User Interaction**: User types `/todo add Buy moving boxes` in Discord
2. **Command Processing**: Discord bot receives interaction, defers reply
3. **Intent Mapping**: Bot converts to "Add a new task: Buy moving boxes"
4. **Orchestration**: 
   - Orchestrator sends request to OpenAI
   - OpenAI determines to use `add_todo` tool
   - MCP tool call executed via HTTP
5. **MCP Execution**: Server creates task, saves to JSON
6. **Response Flow**: Result flows back through orchestrator to Discord

### Storage Architecture

- **Format**: JSON array of todo objects
- **Schema**: 
  ```typescript
  {
    id: number,
    title: string,
    done: boolean,
    notes?: string[]
  }
  ```
- **Location**: Configurable via DATA_DIR environment variable
- **Persistence**: Fly.io volume mount ensures data survives restarts

## Security Considerations

### Authentication Layers

1. **Discord Bot Token**: Authenticates bot to Discord
2. **MCP Bearer Token**: Protects MCP HTTP endpoint
3. **OpenAI API Key**: Authenticates orchestrator requests

### Network Security

- HTTPS enforced on Fly.io
- No global JSON body parser to prevent request tampering
- Environment-based configuration for all secrets

## Important Implementation Notes

### Body Parser Isolation

The HTTP server deliberately avoids `app.use(express.json())` because the MCP Streamable transport needs raw request bodies. This is critical for proper protocol operation.

### Session Management

Each MCP client connection gets a unique session ID, allowing multiple concurrent clients while maintaining state isolation.

### Error Handling Strategy

- Discord interactions always receive a response (error or success)
- MCP server errors are caught and returned as user-friendly messages
- HTTP server continues running even if Discord bot fails to start

## Future Considerations

### Per-User Task Views
- Current: Single shared task list for all users
- Future: Filter tasks by Discord user ID
- Implementation: Add `userId` field to task schema

### RAG Integration
- Current: Simple task CRUD operations
- Future: Semantic search over task history
- Implementation: Vector embeddings for task content

### Web Search Integration
- Current: Isolated task management
- Future: Research capabilities for tasks
- Implementation: Add web search as MCP tool

### Database Migration
- Current: JSON file storage
- Future: SQLite for better concurrent access
- Key: Keep tool interfaces unchanged for compatibility

### Multi-Server Support
- Current: Single Discord server
- Future: Per-server task isolation
- Implementation: Prefix storage keys with guild ID

### Advanced Discord Features
- Ephemeral replies for reduced channel noise
- Button-based interactions for common operations
- Scheduled reminders for tasks
- Direct message support

### Monitoring and Analytics
- Task completion rates
- User engagement metrics
- Performance monitoring
- Error tracking and alerting

## Development Best Practices

1. **Tool Interface Stability**: Keep MCP tool signatures stable to avoid breaking changes
2. **Graceful Degradation**: System components should handle failures independently
3. **Configuration Validation**: Validate all environment variables on startup
4. **Structured Logging**: Use consistent log formats for easier debugging
5. **Type Safety**: Leverage TypeScript for compile-time guarantees

## Deployment Considerations

- **Zero-Downtime Updates**: Blue-green deployments on Fly.io
- **Data Backup**: Regular volume snapshots
- **Scaling**: Horizontal scaling requires distributed storage solution
- **Rate Limiting**: Implement for both Discord and OpenAI API calls