// A simple MCP client for StreamableHTTP transport
import { randomUUID } from "node:crypto";

interface McpSession {
  id: string;
  initialized: boolean;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class McpClient {
  private baseUrl: string;
  private authToken: string | undefined;
  private session: McpSession | undefined;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  private async makeRequest(body: any, sessionId?: string): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      // StreamableHTTPServerTransport requires accepting both JSON and SSE
      "Accept": "application/json, text/event-stream",
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    if (sessionId) {
      headers["mcp-session-id"] = sessionId;
    }

    return fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  async initialize(): Promise<void> {
    // Send initialize request without session ID
    const initRequest = {
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "0.1.0",
        capabilities: {},
        clientInfo: {
          name: "discord-bot",
          version: "1.0.0",
        },
      },
      id: 1,
    };

    console.log("Sending MCP initialize request to:", this.baseUrl);
    const response = await this.makeRequest(initRequest);
    
    if (!response.ok) {
      const text = await response.text();
      console.error("Initialize failed:", response.status, response.statusText);
      console.error("Response body:", text);
      console.error("Response headers:", Object.fromEntries(response.headers.entries()));
      throw new Error(`Initialize failed: ${response.statusText}`);
    }

    // Get session ID from response headers
    const sessionId = response.headers.get("mcp-session-id");
    if (!sessionId) {
      throw new Error("No session ID returned");
    }

    this.session = { id: sessionId, initialized: false };
    console.log("MCP session initialized with ID:", sessionId);
    
    // Check content type to handle response appropriately
    const contentType = response.headers.get("content-type");
    console.log("Response content type:", contentType);
    
    if (contentType?.includes("text/event-stream")) {
      // For SSE responses, we need to parse the event stream
      const text = await response.text();
      console.log("SSE response received, length:", text.length);
      
      // Parse SSE data to find the initialize response
      const lines = text.split('\n');
      let foundResponse = false;
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.id === 1) { // Our initialize request ID
              if (data.error) {
                throw new Error(`MCP init error: ${data.error.message}`);
              }
              foundResponse = true;
              console.log("Initialize response found in SSE stream");
              break;
            }
          } catch (e) {
            // Continue parsing other lines
          }
        }
      }
      if (!foundResponse) {
        console.log("No initialize response found in SSE stream");
      }
    } else {
      // JSON response
      const result = await response.json() as JsonRpcResponse;
      if (result.error) {
        throw new Error(`Initialize error: ${result.error.message}`);
      }
    }

    // Send initialized notification
    const notifyRequest = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    };

    const notifyResponse = await this.makeRequest(notifyRequest, sessionId);
    if (!notifyResponse.ok) {
      console.warn("Initialized notification failed:", notifyResponse.status);
    }

    this.session.initialized = true;
    console.log("MCP session initialized:", sessionId);
  }

  async callTool(name: string, args: any): Promise<string> {
    if (!this.session?.initialized) {
      await this.initialize();
    }

    const requestId = Date.now();
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
      id: requestId,
    };

    const response = await this.makeRequest(request, this.session!.id);
    
    if (!response.ok) {
      // If session error, try reinitializing
      if (response.status === 400 || response.status === 406) {
        console.log("Session error, reinitializing...");
        this.session = undefined;
        await this.initialize();
        
        // Retry the request
        const retryResponse = await this.makeRequest(request, this.session!.id);
        if (!retryResponse.ok) {
          throw new Error(`Tool call failed after retry: ${retryResponse.statusText}`);
        }
        
        const retryResult = await retryResponse.json() as JsonRpcResponse;
        if (retryResult.error) {
          throw new Error(`Tool error: ${retryResult.error.message}`);
        }
        
        return retryResult.result?.content?.[0]?.text || "Operation completed";
      }
      
      throw new Error(`Tool call failed: ${response.statusText}`);
    }

    // Check content type to handle response appropriately
    const contentType = response.headers.get("content-type");
    
    if (contentType?.includes("text/event-stream")) {
      // For SSE responses, parse the event stream
      const text = await response.text();
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as JsonRpcResponse;
            if (data.id === requestId) { // Match our request ID
              if (data.error) {
                throw new Error(`Tool error: ${data.error.message}`);
              }
              return data.result?.content?.[0]?.text || "Operation completed";
            }
          } catch (e) {
            // Continue parsing other lines
          }
        }
      }
      throw new Error("No tool response found in SSE stream");
    } else {
      // JSON response
      const result = await response.json() as JsonRpcResponse;
      if (result.error) {
        throw new Error(`Tool error: ${result.error.message}`);
      }
      return result.result?.content?.[0]?.text || "Operation completed";
    }
  }

  async close(): Promise<void> {
    if (!this.session) return;

    try {
      const response = await fetch(this.baseUrl, {
        method: "DELETE",
        headers: {
          "mcp-session-id": this.session.id,
          ...(this.authToken && { "Authorization": `Bearer ${this.authToken}` }),
        },
      });

      if (!response.ok) {
        console.warn("Failed to close MCP session:", response.status);
      }
    } catch (error) {
      console.error("Error closing MCP session:", error);
    }

    this.session = undefined;
  }
}