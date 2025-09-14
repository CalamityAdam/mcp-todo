import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OrchestratorParams {
  userId: string;
  channel: string;
  text: string;
}

// Simple MCP client implementation
async function callMcpTool(toolName: string, args: any) {
  const response = await fetch(process.env.MCP_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.TODO_MCP_TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP call failed: ${response.statusText}`);
  }

  const result = await response.json() as any;
  if (result.error) {
    throw new Error(`MCP error: ${result.error.message}`);
  }

  return result.result?.content?.[0]?.text || "Operation completed";
}

export async function orchestrateRequest({
  userId,
  channel,
  text,
}: OrchestratorParams): Promise<string> {
  if (!process.env.MCP_URL || !process.env.TODO_MCP_TOKEN) {
    throw new Error("MCP_URL and TODO_MCP_TOKEN must be configured");
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful todo list assistant for a household move. Keep responses brief and actionable (1-3 lines). 
When using tools, format responses clearly with task IDs when relevant.
User: ${userId} | Channel: ${channel}

Available tools:
- list_todos: Returns all todos
- add_todo(title): Creates a new todo
- toggle_todo(id): Toggles completion status
- add_note(id, note): Adds a note to a todo
- remove_todo(id): Removes a todo`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_todos",
            description: "List all todos",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "function",
          function: {
            name: "add_todo",
            description: "Add a new todo",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The todo title" },
              },
              required: ["title"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "toggle_todo",
            description: "Toggle a todo's completion status",
            parameters: {
              type: "object",
              properties: {
                id: { type: "number", description: "The todo ID" },
              },
              required: ["id"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "add_note",
            description: "Add a note to a todo",
            parameters: {
              type: "object",
              properties: {
                id: { type: "number", description: "The todo ID" },
                note: { type: "string", description: "The note to add" },
              },
              required: ["id", "note"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "remove_todo",
            description: "Remove a todo",
            parameters: {
              type: "object",
              properties: {
                id: { type: "number", description: "The todo ID" },
              },
              required: ["id"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    // Handle tool calls
    const message = response.choices[0]?.message;
    if (!message) {
      return "I couldn't process that request. Please try again.";
    }

    // If there are tool calls, execute them
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolResults = [];
      
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await callMcpTool(toolCall.function.name, args);
            toolResults.push(result);
          } catch (error) {
            console.error(`Tool call error for ${toolCall.function.name}:`, error);
            toolResults.push(`Error executing ${toolCall.function.name}`);
          }
        }
      }

      // Get final response with tool results
      const followUp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful todo list assistant. Keep responses brief and actionable (1-3 lines).`,
          },
          {
            role: "user",
            content: text,
          },
          message,
          {
            role: "tool",
            content: toolResults.join("\n"),
            tool_call_id: message.tool_calls[0]?.id || "tool",
          },
        ],
      });

      return followUp.choices[0]?.message?.content || "Task completed successfully.";
    }

    // Return direct response if no tools were called
    return message.content || "I couldn't process that request. Please try again.";
  } catch (error) {
    console.error("Orchestrator error:", error);
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes("API key")) {
        return "Configuration error: OpenAI API key is not properly set.";
      }
      if (error.message.includes("MCP")) {
        return "Unable to connect to the todo service. Please try again later.";
      }
    }
    return "An error occurred while processing your request. Please try again.";
  }
}