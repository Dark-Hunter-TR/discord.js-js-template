const chalk = require("chalk");
const fs = require("fs").promises;
const path = require("path");
const AsciiTable = require("ascii-table");

/**
 * Optimized command handler for loading prefix commands
 * @param {Object} client - Discord client object
 * @returns {Promise<void>}
 */
module.exports = async (client) => {
  try {
    if (!client?.commands || !client?.aliases) {
      throw new Error("Invalid client object: Missing commands or aliases maps.");
    }

    const commandsBasePath = path.join(process.cwd(), "src", "commands", "prefix");
    const table = new AsciiTable()
      .setHeading("Commands", "Status")
      .setBorder("|", "=", "0", "0");

    const commandDirs = (await fs.readdir(commandsBasePath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory());
    
    let loadedCount = 0;
    let failedCount = 0;
    let startTime = performance.now();

    await Promise.all(commandDirs.map(async (dirEntry) => {
      const categoryDir = path.join(commandsBasePath, dirEntry.name);
      const categoryName = dirEntry.name;
      
      try {
        const commandFiles = (await fs.readdir(categoryDir))
          .filter(file => file.endsWith(".js") && !file.startsWith("_"));

        await Promise.all(commandFiles.map(async (file) => {
          const filePath = path.join(categoryDir, file);
          
          try {
            const stats = await fs.stat(filePath);
            
            delete require.cache[require.resolve(filePath)];
            
            const commandModule = require(filePath);
            const command = commandModule.default || commandModule;

            if (!command || typeof command !== 'object' || !command.name) {
              console.warn(chalk.yellow(`[WARNING] Invalid command structure: ${{filePath}}`));
              table.addRow(file, "⚠️ Invalid", categoryName, "N/A", "N/A");
              failedCount++;
              return;
            }

            command.category = categoryName;
            command.path = filePath;

            client.commands.set(command.name, command);
            
            if (Array.isArray(command.aliases)) {
              for (const alias of command.aliases) {
                if (typeof alias === 'string') {
                  client.aliases.set(alias, command.name);
                }
              }
            }

            table.addRow(
              command.name, 
              chalk.green("✅"), 
            );
            
            loadedCount++;
          } catch (commandLoadError) {
            console.error(chalk.red(`[ERROR] Error loading command ${file}: ${commandLoadError.message}`));
            table.addRow(file, "❌ Hata", categoryName, "N/A", "N/A");
            failedCount++;
          }
        }));
      } catch (categoryReadError) {
        console.error(chalk.red(`[ERROR] Error reading category ${categoryName}: ${categoryReadError.message}`));
      }
    }));

    const executionTime = (performance.now() - startTime).toFixed(2);
    
    console.log(chalk.blue(table.toString()));
    
    return { loaded: loadedCount, failed: failedCount, executionTime };
  } catch (mainError) {
    console.error(chalk.red(`[Fatal Error] Error in command loader: ${mainError.message}`));
    console.error(mainError);
    return { loaded: 0, failed: 0, error: mainError };
  }
}