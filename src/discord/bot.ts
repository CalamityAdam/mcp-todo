import { Client, GatewayIntentBits, Interaction } from "discord.js";
import { orchestrateRequest } from "../orchestrator.js";

export class DiscordBot {
  private client: Client;
  private isReady = false;

  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once("ready", () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      this.isReady = true;
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      if (interaction.commandName !== "todo") return;

      // Defer the reply immediately
      await interaction.deferReply();

      try {
        const subcommand = interaction.options.getSubcommand();
        let text = "";

        switch (subcommand) {
          case "add":
            text = `Add a new task: ${interaction.options.getString("title", true)}`;
            break;
          case "list":
            text = "List all remaining tasks";
            break;
          case "toggle":
            text = `Toggle task ${interaction.options.getInteger("id", true)}`;
            break;
          case "note":
            text = `Add note to task ${interaction.options.getInteger("id", true)}: ${interaction.options.getString("note", true)}`;
            break;
          case "remove":
            text = `Remove task ${interaction.options.getInteger("id", true)}`;
            break;
          default:
            await interaction.editReply("Unknown command");
            return;
        }

        // Call the orchestrator
        const response = await orchestrateRequest({
          userId: interaction.user.id,
          channel: "discord",
          text,
        });

        // Edit the deferred reply with the response
        await interaction.editReply(response);
      } catch (error) {
        console.error("Error handling Discord interaction:", error);
        await interaction.editReply(
          "Sorry, I encountered an error while processing your request. Please try again."
        );
      }
    });

    this.client.on("error", (error) => {
      console.error("Discord client error:", error);
    });
  }

  async start() {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("DISCORD_TOKEN is required");
    }

    await this.client.login(process.env.DISCORD_TOKEN);
    
    // Wait for ready event
    return new Promise<void>((resolve) => {
      if (this.isReady) {
        resolve();
      } else {
        this.client.once("ready", () => resolve());
      }
    });
  }

  async stop() {
    await this.client.destroy();
  }
}