// http.ts
import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTodoMcpServer } from "./server.js"; // import the factory
import { twilioWebhook, sendSms } from "./twilio.js";
import twilio from "twilio";

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

// Import handleSms dynamically to avoid initialization issues
let handleSms: any;

// Twilio WhatsApp webhook route
app.post(
  "/twilio/whatsapp",
  express.urlencoded({ extended: false }), // Twilio sends form-encoded
  twilioWebhook, // validation
  async (req, res) => {
    const from = String(req.body.From || "");
    const body = String(req.body.Body || "");
    
    // Extract phone number from WhatsApp format (whatsapp:+1234567890 -> +1234567890)
    const phoneNumber = from.replace('whatsapp:', '');
    
    // Check if the sender is allowed
    const allowedNumbers = process.env.ALLOWED_WHATSAPP_FROM?.split(",") || [];
    if (allowedNumbers.length > 0 && !allowedNumbers.includes(phoneNumber)) {
      return res.type("text/xml").send("<Response></Response>"); // no-op
    }
    
    // Fast ACK via TwiML (WhatsApp doesn't show typing indicators like SMS)
    const MessagingResponse = (twilio as any).twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    // For WhatsApp, we don't need to send an immediate response
    res.type("text/xml").send(twiml.toString()); // return empty response
    
    // Kick off async AI flow
    queueMicrotask(async () => {
      try {
        // Import handleSms dynamically when needed
        if (!handleSms) {
          const module = await import("./ai/orchestrator.js");
          handleSms = module.handleSms;
        }
        // Pass the full WhatsApp format to maintain consistency
        await handleSms({ from, text: body });
      } catch (error) {
        console.error("Error handling WhatsApp message:", error);
      }
    });
  }
);

// Keep SMS endpoint for backward compatibility
app.post("/twilio/sms", (req, res) => {
  res.status(200).send("Please use /twilio/whatsapp endpoint for WhatsApp messages");

});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`MCP Streamable HTTP listening on http://localhost:${PORT}/mcp`);
  console.log(`Twilio WhatsApp webhook at http://localhost:${PORT}/twilio/whatsapp`);
});
