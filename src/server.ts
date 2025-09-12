import "dotenv/config";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

export const TodoSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  done: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  notes: z.array(z.string()).default([]),
});
type Todo = z.infer<typeof TodoSchema>;

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_PATH = path.join(DATA_DIR, ".mcp-todos.json");

async function readTodos(): Promise<Todo[]> {
  try {
    const s = await fs.readFile(DB_PATH, "utf-8");
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
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  
  // Atomic write: write to temp file then rename
  const tmpPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(todos, null, 2), "utf-8");
  await fs.rename(tmpPath, DB_PATH);
}

// ✅ Export a factory that builds and returns a fully-registered server
export function createTodoMcpServer() {
  const server = new McpServer({ name: "todo-mcp", version: "1.0.0" });

  server.registerResource(
    "todos",
    "todos://list",
    {
      title: "All Todos",
      description: "Current todo list",
      mimeType: "application/json",
    },
    async (uri) => {
      const todos = await readTodos();
      return {
        contents: [{ uri: uri.href, text: JSON.stringify(todos, null, 2) }],
      };
    }
  );

  // Tools
  server.registerTool(
    "list_todos",
    {
      title: "List Todos",
      description: "Return all todos in a structured format.",
      inputSchema: {},
      outputSchema: {
        todos: z.array(TodoSchema),
      },
    },
    async () => {
      const todos = await readTodos();
      return {
        structuredContent: { todos },
        content: [{ type: "text", text: JSON.stringify({ todos }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "add_todo",
    {
      title: "Add Todo",
      description: "Add a todo item",
      inputSchema: { 
        title: z.string().min(1),
        createdBy: z.string().optional(),
      },
    },
    async ({ title, createdBy }) => {
      const todos = await readTodos();
      const id = (todos.at(-1)?.id ?? 0) + 1;
      const now = new Date().toISOString();
      const newTodo: Todo = {
        id,
        title,
        done: false,
        createdAt: now,
        updatedAt: now,
        createdBy,
        notes: [],
      };
      todos.push(newTodo);
      await writeTodos(todos);
      return { 
        structuredContent: { todo: newTodo, message: `Added #${id}: ${title}` },
        content: [{ type: "text", text: `Added #${id}: ${title}` }] 
      };
    }
  );

  server.registerTool(
    "toggle_todo",
    {
      title: "Toggle Todo",
      description: "Toggle a todo by id",
      inputSchema: { id: z.number().int().positive() },
    },
    async ({ id }) => {
      const todos = await readTodos();
      const i = todos.findIndex((t) => t.id === id);
      if (i === -1)
        return { content: [{ type: "text", text: `No todo with id ${id}` }] };
      const todo = todos[i]!;
      todo.done = !todo.done;
      todo.updatedAt = new Date().toISOString();
      await writeTodos(todos);
      return {
        content: [
          {
            type: "text",
            text: `Toggled #${id} to ${todo.done ? "done" : "not done"}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "remove_todo",
    {
      title: "Remove Todo",
      description: "Remove a todo by id",
      inputSchema: { id: z.number().int().positive() },
    },
    async ({ id }) => {
      const todos = await readTodos();
      const next = todos.filter((t) => t.id !== id);
      if (next.length === todos.length)
        return { content: [{ type: "text", text: `No todo with id ${id}` }] };
      await writeTodos(next);
      return { content: [{ type: "text", text: `Removed #${id}` }] };
    }
  );

  server.registerTool(
    "add_note_to_todo",
    {
      title: "Add Note to Todo",
      description: "Add a note to an existing todo",
      inputSchema: {
        id: z.number().int().positive(),
        note: z.string().min(1),
        createdBy: z.string().optional(),
      },
    },
    async ({ id, note, createdBy }) => {
      const todos = await readTodos();
      const todoIndex = todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) {
        return { content: [{ type: "text", text: `No todo with id ${id}` }] };
      }
      
      const todo = todos[todoIndex]!;
      todo.notes.push(note);
      todo.updatedAt = new Date().toISOString();
      
      await writeTodos(todos);
      
      return {
        structuredContent: { 
          todo,
          message: `Added note to #${id}: ${note}` 
        },
        content: [{ type: "text", text: `Added note to #${id}: ${note}` }],
      };
    }
  );

  server.registerTool(
    "list_open_todos",
    {
      title: "List Open Todos",
      description: "Return all todos that are not done",
      inputSchema: {},
    },
    async () => {
      const todos = await readTodos();
      const openTodos = todos.filter((t) => !t.done);
      return {
        structuredContent: { todos: openTodos },
        content: [{ type: "text", text: JSON.stringify({ todos: openTodos }, null, 2) }],
      };
    }
  );

  server.registerTool(
    "update_title",
    {
      title: "Update Todo Title",
      description: "Update the title of an existing todo",
      inputSchema: {
        id: z.number().int().positive(),
        title: z.string().min(1),
      },
    },
    async ({ id, title }) => {
      const todos = await readTodos();
      const todoIndex = todos.findIndex((t) => t.id === id);
      if (todoIndex === -1) {
        return { content: [{ type: "text", text: `No todo with id ${id}` }] };
      }
      
      const todo = todos[todoIndex]!;
      todo.title = title;
      todo.updatedAt = new Date().toISOString();
      
      await writeTodos(todos);
      
      return {
        structuredContent: { 
          todo,
          message: `Updated #${id} title to: ${title}` 
        },
        content: [{ type: "text", text: `Updated #${id} title to: ${title}` }],
      };
    }
  );

  return server;
}

// ── Keep stdio entrypoint for local dev, but guard it ──
// Run stdio only when explicitly requested (e.g., MCP_STDIO=1)
if (process.env.MCP_STDIO === "1") {
  (async () => {
    const server = createTodoMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (process.env.MCP_STDIO === "0") {
  // When MCP_STDIO=0, start the HTTP server
  import("./http.js");
}
