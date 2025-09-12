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
});
type Todo = z.infer<typeof TodoSchema>;

const DB_PATH = path.join(process.env.HOME || process.cwd(), ".mcp-todos.json");

async function readTodos(): Promise<Todo[]> {
  try {
    const s = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(s);
  } catch {
    return [];
  }
}
async function writeTodos(todos: Todo[]) {
  await fs.writeFile(DB_PATH, JSON.stringify(todos, null, 2), "utf-8");
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
      inputSchema: { title: z.string().min(1) },
    },
    async ({ title }) => {
      const todos = await readTodos();
      const id = (todos.at(-1)?.id ?? 0) + 1;
      todos.push({ id, title, done: false });
      await writeTodos(todos);
      return { content: [{ type: "text", text: `Added #${id}: ${title}` }] };
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
}
