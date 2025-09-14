// http.ts
import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoMcpServer } from "./server.js"; // import the factory
import { DiscordBot } from "./discord/bot.js";

const app = express();
// ⚠️ Do NOT use app.use(express.json()) here.
// The transport needs raw request bodies.

// Session map (one transport per active MCP session)
const sessions = new Map<string, StreamableHTTPServerTransport>();

function assertAuth(
  req: import("express").Request,
  res: import("express").Response
) {
  const token = process.env.TODO_MCP_TOKEN;
  if (!token) return true; // auth disabled
  const got = req.headers.authorization || "";
  if (got !== `Bearer ${token}`) {
    res.status(401).end("unauthorized");
    return false;
  }
  return true;
}

async function getOrCreateTransport(req: import("express").Request) {
  const headerKey = "mcp-session-id";
  const incomingId = (req.header(headerKey) as string | undefined) || undefined;

  if (incomingId && sessions.has(incomingId)) {
    return sessions.get(incomingId)!;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id): void => {
      sessions.set(id, transport);
    },
    // optional: onsessionclosed: (id) => sessions.delete(id),
  });

  const server = createTodoMcpServer();
  await server.connect(transport);
  return transport;
}

// POST = client → server (JSON-RPC)
app.post("/mcp", async (req, res) => {
  if (!assertAuth(req, res)) return;
  const transport = await getOrCreateTransport(req);
  await transport.handleRequest(req, res);
});

// GET = server → client (SSE stream for server->client notifications)
app.get("/mcp", async (req, res) => {
  if (!assertAuth(req, res)) return;
  const sid = req.header("mcp-session-id") as string | undefined;
  if (!sid || !sessions.has(sid))
    return res.status(400).end("missing or unknown mcp-session-id");
  const transport = sessions.get(sid)!;
  await transport.handleRequest(req, res);
});

// DELETE = end the session
app.delete("/mcp", async (req, res) => {
  if (!assertAuth(req, res)) return;
  const sid = req.header("mcp-session-id") as string | undefined;
  if (!sid || !sessions.has(sid))
    return res.status(400).end("missing or unknown mcp-session-id");
  const transport = sessions.get(sid)!;
  await transport.handleRequest(req, res);
  sessions.delete(sid);
});

const PORT = Number(process.env.PORT) || 3000;

// Start HTTP server
const server = app.listen(PORT, async () => {
  console.log(`MCP Streamable HTTP listening on http://localhost:${PORT}/mcp`);
  
  // Start Discord bot if token is provided
  if (process.env.DISCORD_TOKEN) {
    try {
      const discordBot = new DiscordBot();
      await discordBot.start();
      console.log("Discord bot started successfully");
      
      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        console.log("Shutting down...");
        await discordBot.stop();
        server.close(() => {
          process.exit(0);
        });
      });
      
      process.on("SIGTERM", async () => {
        console.log("Shutting down...");
        await discordBot.stop();
        server.close(() => {
          process.exit(0);
        });
      });
    } catch (error) {
      console.error("Failed to start Discord bot:", error);
      // Continue running HTTP server even if Discord bot fails
    }
  } else {
    console.log("Discord bot not started (DISCORD_TOKEN not provided)");
  }
});
