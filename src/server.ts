import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z, ZodRawShape } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

// type Todo = { id: number; title: string; done: boolean };

const TodoSchema = z.object({
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

const server = new McpServer({ name: "todo-mcp", version: "1.0.0" });

// Resource: list todos as JSON (read-only)
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

// Tool: list all todos
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

// Tool: add todo
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

// Tool: toggle done
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
    const todo = todos[i];
    if (!todo)
      return { content: [{ type: "text", text: `No todo with id ${id}` }] };
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

// Tool: remove
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport); // keep process alive, communicate over stdio
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
