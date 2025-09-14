import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

async function registerCommands() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!clientId || !token) {
    throw new Error("DISCORD_CLIENT_ID and DISCORD_TOKEN are required");
  }

  const commands = [
    new SlashCommandBuilder()
      .setName("todo")
      .setDescription("Manage your todo list")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription("Add a new task")
          .addStringOption((option) =>
            option
              .setName("title")
              .setDescription("The task title")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("list")
          .setDescription("List all remaining tasks")
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("toggle")
          .setDescription("Toggle a task's completion status")
          .addIntegerOption((option) =>
            option
              .setName("id")
              .setDescription("The task ID")
              .setRequired(true)
              .setMinValue(1)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("note")
          .setDescription("Add a note to a task")
          .addIntegerOption((option) =>
            option
              .setName("id")
              .setDescription("The task ID")
              .setRequired(true)
              .setMinValue(1)
          )
          .addStringOption((option) =>
            option
              .setName("note")
              .setDescription("The note to add")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove")
          .setDescription("Remove a task")
          .addIntegerOption((option) =>
            option
              .setName("id")
              .setDescription("The task ID")
              .setRequired(true)
              .setMinValue(1)
          )
      ),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    let data;
    if (guildId) {
      // Guild-specific commands (instant update)
      console.log(`Registering commands to guild: ${guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
    } else {
      // Global commands (may take up to 1 hour to propagate)
      console.log("Registering commands globally");
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
    }

    console.log(`Successfully registered ${(data as any[]).length} commands.`);
  } catch (error) {
    console.error("Error registering commands:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  registerCommands()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { registerCommands };