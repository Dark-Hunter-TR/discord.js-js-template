const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
});

const config = require(`${process.cwd()}/src/configs/bot.js`);

process.on("unhandledRejetion", async (reason, promise) => {
  console.log(reason, promise);
});
process.on("uncaughtException", async (err) => {
  console.log(err);
});
process.on("uncaughtExceptMonitor", async (err, origin) => {
  console.log(err, origin);
});

client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();

client.exec = async (code) => require("child_process").execSync(code).toString();
client.classes = (className) => require(`${process.cwd()}/src/classes/${className}`);
client.functions = (utilsName) => require(`${process.cwd()}/src/functions/${utilsName}`);

client.prefix = config.PREFIX;
client.config = config;

module.exports = client;

fs.readdirSync(`${process.cwd()}/src/handlers`).forEach((handler) => {
  require(`${process.cwd()}/src/handlers/${handler}`)(client);
});

client.login(process.env.BOT_TOKEN);