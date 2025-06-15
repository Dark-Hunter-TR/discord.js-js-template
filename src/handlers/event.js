const chalk = require("chalk");
const fs = require("fs").promises;
const path = require("path");
const AsciiTable = require("ascii-table");

module.exports = async (client) => {
  try {
    const eventsBasePath = path.join(process.cwd(), "src", "events");
    const table = new AsciiTable()
      .setHeading("Events", "Type", "Status")
      .setBorder("|", "=", "0", "0");

    const eventDirs = (await fs.readdir(eventsBasePath, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory());
    
    let loadedCount = 0;
    let failedCount = 0;
    let startTime = performance.now();

    await Promise.all(eventDirs.map(async (dirEntry) => {
      const categoryDir = path.join(eventsBasePath, dirEntry.name);
      const categoryName = dirEntry.name;
      
      try {
        const eventFiles = (await fs.readdir(categoryDir))
          .filter(file => file.endsWith(".js") && !file.startsWith("_"));

        await Promise.all(eventFiles.map(async (file) => {
          const filePath = path.join(categoryDir, file);
          
          try {
            const stats = await fs.stat(filePath);
            
            delete require.cache[require.resolve(filePath)];
            
            const eventModule = require(filePath);
            const event = eventModule.default || eventModule;

            if (!event || typeof event !== 'object' || !event.name || !event.execute) {
              console.warn(chalk.yellow(`[WARNING] Invalid event structure: ${filePath}`));
              table.addRow(file.replace(".js", ""), "N/A", categoryName, "⚠️ Invalid", stats.birthtime.toLocaleDateString());
              failedCount++;
              return;
            }

            event.category = categoryName;
            event.path = filePath;
            event.createDate = stats.birthtime;
            event.updateDate = stats.mtime;

            if (event.once) {
              client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
              client.on(event.name, (...args) => event.execute(client, ...args));
            }

            table.addRow(
              event.name,
              event.once ? "Once" : "On",
              categoryName,
              chalk.green("✅"),
            );
            
            loadedCount++;
          } catch (eventLoadError) {
            console.error(chalk.red(`[ERROR] Error loading event ${file}: ${eventLoadError.message}`));
            table.addRow(file.replace(".js", ""), "N/A", categoryName, "❌ Error", "N/A");
            failedCount++;
          }
        }));
      } catch (categoryReadError) {
        console.error(chalk.red(`[ERROR] Error reading event category ${categoryName}: ${categoryReadError.message}`));
      }
    }));

    const executionTime = (performance.now() - startTime).toFixed(2);
    
    console.log(chalk.green(table.toString()));
    console.log(chalk.blue(`✅ Event loader completed! ${loadedCount} event loaded, ${failedCount} failed (${executionTime}ms)`));
    
    return { loaded: loadedCount, failed: failedCount, executionTime };
  } catch (mainError) {
    console.error(chalk.red(`[Fatal Error] Error in Event loader: ${mainError.message}`));
    console.error(mainError);
    return { loaded: 0, failed: 0, error: mainError };
  }
};
