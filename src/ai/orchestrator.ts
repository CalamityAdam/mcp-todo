import OpenAI from "openai";
import { sendSms } from "../twilio.js";
import { readFile, writeFile } from "fs/promises";
import path from "path";

// Only initialize OpenAI if API key is available and not a placeholder
const hasValidApiKey = process.env.OPENAI_API_KEY && 
  !process.env.OPENAI_API_KEY.includes('your-openai-api-key');
const openai = hasValidApiKey ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Define tool schemas for OpenAI function calling
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_todos",
      description: "Return all todos in a structured format",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_open_todos",
      description: "Return all todos that are not done",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_todo",
      description: "Add a todo item",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The todo item title" },
          createdBy: { type: "string", description: "Phone number of creator" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_note_to_todo",
      description: "Add a note to an existing todo",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The todo ID" },
          note: { type: "string", description: "The note to add" },
          createdBy: { type: "string", description: "Phone number of creator" }
        },
        required: ["id", "note"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "toggle_todo",
      description: "Toggle a todo by id (mark as done/not done)",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The todo ID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_todo",
      description: "Remove a todo by id",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The todo ID" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_title",
      description: "Update the title of an existing todo",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The todo ID" },
          title: { type: "string", description: "The new title" }
        },
        required: ["id", "title"]
      }
    }
  }
];

// Direct implementation of todo operations
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(DATA_DIR, ".mcp-todos.json");

interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  notes: string[];
}

async function readTodos(): Promise<Todo[]> {
  try {
    const s = await readFile(DB_PATH, "utf-8");
    const todos = JSON.parse(s);
    // Backfill defaults for older records
    return todos.map((todo: any) => ({
      ...todo,
      createdAt: todo.createdAt || new Date().toISOString(),
      updatedAt: todo.updatedAt || new Date().toISOString(),
      notes: todo.notes || [],
    }));
  } catch {
    return [];
  }
}

async function writeTodos(todos: Todo[]) {
  // Ensure directory exists
  const fs = await import("fs/promises");
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  
  // Atomic write: write to temp file then rename
  const tmpPath = `${DB_PATH}.tmp`;
  await writeFile(tmpPath, JSON.stringify(todos, null, 2), "utf-8");
  await fs.rename(tmpPath, DB_PATH);
}

// Call tool directly
async function callMcpTool(toolName: string, args: any) {
  switch (toolName) {
    case "list_todos": {
      const todos = await readTodos();
      return {
        content: [{ type: "text", text: JSON.stringify({ todos }, null, 2) }]
      };
    }
    
    case "list_open_todos": {
      const todos = await readTodos();
      const openTodos = todos.filter(t => !t.done);
      return {
        content: [{ type: "text", text: JSON.stringify({ todos: openTodos }, null, 2) }]
      };
    }
    
    case "add_todo": {
      const todos = await readTodos();
      const id = (todos.at(-1)?.id ?? 0) + 1;
      const now = new Date().toISOString();
      const newTodo: Todo = {
        id,
        title: args.title,
        done: false,
        createdAt: now,
        updatedAt: now,
        createdBy: args.createdBy,
        notes: [],
      };
      todos.push(newTodo);
      await writeTodos(todos);
      return {
        content: [{ type: "text", text: `Added #${id}: ${args.title}` }]
      };
    }
    
    case "toggle_todo": {
      const todos = await readTodos();
      const todo = todos.find(t => t.id === args.id);
      if (!todo) {
        return { content: [{ type: "text", text: `No todo with id ${args.id}` }] };
      }
      todo.done = !todo.done;
      todo.updatedAt = new Date().toISOString();
      await writeTodos(todos);
      return {
        content: [{ type: "text", text: `Toggled #${args.id} to ${todo.done ? "done" : "not done"}` }]
      };
    }
    
    case "add_note_to_todo": {
      const todos = await readTodos();
      const todo = todos.find(t => t.id === args.id);
      if (!todo) {
        return { content: [{ type: "text", text: `No todo with id ${args.id}` }] };
      }
      todo.notes.push(args.note);
      todo.updatedAt = new Date().toISOString();
      await writeTodos(todos);
      return {
        content: [{ type: "text", text: `Added note to #${args.id}: ${args.note}` }]
      };
    }
    
    case "remove_todo": {
      const todos = await readTodos();
      const filtered = todos.filter(t => t.id !== args.id);
      if (filtered.length === todos.length) {
        return { content: [{ type: "text", text: `No todo with id ${args.id}` }] };
      }
      await writeTodos(filtered);
      return { content: [{ type: "text", text: `Removed #${args.id}` }] };
    }
    
    case "update_title": {
      const todos = await readTodos();
      const todo = todos.find(t => t.id === args.id);
      if (!todo) {
        return { content: [{ type: "text", text: `No todo with id ${args.id}` }] };
      }
      todo.title = args.title;
      todo.updatedAt = new Date().toISOString();
      await writeTodos(todos);
      return {
        content: [{ type: "text", text: `Updated #${args.id} title to: ${args.title}` }]
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

export async function handleSms({ from, text }: { from: string; text: string }) {
  console.log(`Received WhatsApp message from ${from}: ${text}`);

  try {
    // For testing without OpenAI API key
    if (!openai) {
      console.log("OpenAI not configured, using direct command parsing");
      
      // Simple command parsing for testing
      if (text.toLowerCase().includes("add") && text.toLowerCase().includes("task")) {
        const match = text.match(/add (?:a )?task (?:to )?(.+)/i);
        if (match && match[1]) {
          const title = match[1].trim();
          const result = await callMcpTool("add_todo", { title, createdBy: from });
          const content = result.content?.[0]?.text || 'Task added';
          await sendSms(from, content);
          return;
        }
      } else if (text.toLowerCase().includes("list")) {
        const isOpen = text.toLowerCase().includes("open") || text.toLowerCase().includes("remaining");
        const result = await callMcpTool(isOpen ? "list_open_todos" : "list_todos", {});
        const data = JSON.parse(result.content?.[0]?.text || '{}');
        const todos = data.todos || [];
        
        if (todos.length === 0) {
          await sendSms(from, "No tasks found.");
          return;
        }
        
        const message = todos.slice(0, 5).map((t: any) => `#${t.id}: ${t.title}${t.done ? ' ✓' : ''}`).join('\n');
        await sendSms(from, message + (todos.length > 5 ? '\n...' : ''));
        return;
      }
      
      await sendSms(from, "Commands: 'add task [title]', 'list tasks', 'list open tasks'");
      return;
    }
    // System prompt for MoveBuddy
    const systemPrompt = `You are MoveBuddy, a household move assistant for two people. Keep replies short (1–3 lines). If the user asks to list, show only open tasks with IDs. Prefer editing existing tasks over creating duplicates.

Important:
- When adding todos, always include createdBy: "${from}" in the parameters
- When adding notes, always include createdBy: "${from}" in the parameters
- Keep SMS responses concise and actionable
- Use task IDs when referring to specific todos
- Format lists clearly with task ID and title`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: text
      }
    ];

    let finalMessage = "";
    let toolCalls = 0;
    const maxToolCalls = 5; // Prevent infinite loops

    while (toolCalls < maxToolCalls) {
      console.log(`Making OpenAI call (attempt ${toolCalls + 1})...`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
      });

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error("No response from OpenAI");
      }

      // Add assistant's message to conversation
      messages.push(message);

      // If there are tool calls, execute them
      if (message.tool_calls && message.tool_calls.length > 0) {
        toolCalls++;
        
        for (const toolCall of message.tool_calls) {
          if ('function' in toolCall) {
            console.log(`Executing tool: ${toolCall.function.name} with args:`, toolCall.function.arguments);
          
            try {
              const args = JSON.parse(toolCall.function.arguments);
            
            // Add createdBy if not present for relevant tools
            if ((toolCall.function.name === "add_todo" || toolCall.function.name === "add_note_to_todo") && !args.createdBy) {
              args.createdBy = from;
            }
            
            const result = await callMcpTool(toolCall.function.name, args);
            
            // Add tool result to conversation
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            console.error(`Tool call error:`, error);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
              });
            }
          }
        }
      } else {
        // No more tool calls, we have the final response
        finalMessage = message.content || "Task completed.";
        break;
      }
    }

    if (!finalMessage) {
      finalMessage = "I've completed the task. Is there anything else you need?";
    }

    // Send the response via SMS
    await sendSms(from, finalMessage);
    console.log(`Sent SMS response to ${from}: ${finalMessage}`);

  } catch (error) {
    console.error("Error in handleSms:", error);
    
    // Send error message to user
    try {
      await sendSms(from, "Sorry, I encountered an error processing your request. Please try again.");
    } catch (smsError) {
      console.error("Failed to send error SMS:", smsError);
    }
  }
}