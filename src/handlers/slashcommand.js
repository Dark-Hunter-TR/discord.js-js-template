const chalk = require("chalk");
const fs = require("fs").promises;
const path = require("path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const AsciiTable = require("ascii-table");
const { SlashCommandBuilder, Collection } = require("discord.js");

module.exports = async (client) => {
  try {
    const slashBasePath = path.join(process.cwd(), "src", "commands", "slash");
    const table = new AsciiTable()
      .setHeading("Slash", "Category", "Status")
      .setBorder("|", "=", "0", "0");

    client.slashCommands = new Collection();
    client.slashArray = [];

    const TOKEN = process.env.BOT_TOKEN;
    const CLIENT_ID = process.env.BOT_ID;

    if (!TOKEN || !CLIENT_ID) {
      throw new Error("BOT_TOKEN and BOT_ID environment variables are not defined!");
    }

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    let loadedCount = 0;
    let failedCount = 0;
    let startTime = performance.now();

    const commandDirs = await fs.readdir(slashBasePath, { withFileTypes: true });
    const categoryDirs = commandDirs.filter(dirent => dirent.isDirectory());

    await Promise.all(categoryDirs.map(async (dirEntry) => {
      const categoryDir = path.join(slashBasePath, dirEntry.name);
      const categoryName = dirEntry.name;
      
      try {
        const slashCommandFiles = (await fs.readdir(categoryDir))
          .filter(file => file.endsWith(".js") && !file.startsWith("_"));

        await Promise.all(slashCommandFiles.map(async (file) => {
          const filePath = path.join(categoryDir, file);
          
          try {
            const stats = await fs.stat(filePath);
            
            delete require.cache[require.resolve(filePath)];
            
            const command = require(filePath);

            if (!command.data || !command.data.name || !command.data.description) {
              console.warn(chalk.yellow(`[WARNING] Invalid slash command structure: ${{filePath}}`));
              table.addRow(file.replace(".js", ""), categoryName, "⚠️ Invalid", "N/A", "N/A");
              failedCount++;
              return;
            }

            command.data.category = categoryName;
            command.data.path = filePath;

            client.slashCommands.set(command.data.name, command);
            
            client.slashArray.push(
              command.data instanceof SlashCommandBuilder 
                ? command.data.toJSON() 
                : command.data
            );

            table.addRow(
              command.data.name,
              categoryName,
              chalk.green("✅"),
            );
            
            loadedCount++;
          } catch (commandLoadError) {
            console.error(chalk.red(`[ERROR] Error loading slash command ${file}: ${commandLoadError.message}`));
            table.addRow(file.replace(".js", ""), categoryName, "❌ Error", "N/A", "N/A");
            failedCount++;
          }
        }));
      } catch (categoryReadError) {
        console.error(chalk.red(`[ERROR] Error reading slash command category ${categoryName}: ${categoryReadError.message}`));
      }
    }));

    const executionTime = (performance.now() - startTime).toFixed(2);
    
    console.log(chalk.cyan(table.toString()));
    
    try {
      console.log(chalk.yellow(`[API] ${client.slashArray.length} slash command is being registered in Discord API...`));
      const apiStartTime = performance.now();
      
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: client.slashArray }
      );
      
      const apiExecutionTime = (performance.now() - apiStartTime).toFixed(2);
      console.log(chalk.green(`[API] Slash commands successfully recorded! (${apiExecutionTime}ms)`));
    } catch (apiError) {
      console.error(chalk.red(`[API ERROR] Failed to register slash commands: ${apiError.message}`));
      console.error(apiError);
    }
    
    console.log(chalk.blue(`✅ Slash command loader completed! ${loadedCount} command loaded, ${failedCount} failed (${executionTime}ms)`));
    
    return { loaded: loadedCount, failed: failedCount, registered: client.slashArray.length, executionTime };
  } catch (mainError) {
    console.error(chalk.red(`[Fatal Error] Error in Slash command loader: ${mainError.message}`));
    console.error(mainError);
    return { loaded: 0, failed: 0, registered: 0, error: mainError };
  }
};