const {
  EmbedBuilder,
  Collection,
  PermissionsBitField,
} = require("discord.js");
const ms = require("ms");
const config = require(`${process.cwd()}/src/configs/bot.js`);

module.exports = {
    name: "messageCreate",
    once: false,
    execute: async (client, message) => {
        if(message.author.bot || message.channel.type !== 0) return;
        
        const prefixRegex = new RegExp(`^(${escapeRegex(config.PREFIX)})\\s*`, 'i');
        const matchedPrefix = message.content.match(prefixRegex);
        if (!matchedPrefix) return;
        
        const [, prefix] = matchedPrefix;
        const content = message.content.slice(prefix.length).trim();
        const args = content.split(/ +/g);
        const commandName = args.shift()?.toLowerCase();
        
        if (!commandName) return;
        
        const isOwner = config.OWNERS.includes(message.author.id);
        
        const command = findCommand(commandName, Array.from(client.commands.values()), isOwner);
        
        try {
            if (command) {
                if (await handleCommandPrerequisites(message, command)) {
                    await executeCommand(client, message, command, args);
                }
      } else {
        const errorEmbed = new EmbedBuilder()
          .setColor(config.COLORS.RED)
          .setTitle("🚫 Command Not Found")
          .setDescription(`No command named \`${commandName}\` was found. Please check the command name or type \`${config.PREFIX}help\` for help.`)
          .setTimestamp();
        
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
      }
    } catch (error) {
        console.error('Message Processing Error:', error);
        const errorEmbed = new EmbedBuilder()
        .setColor(config.COLORS.RED)
        .setTitle("❌ System Error")
        .setDescription("A system error has occurred. Please try again later. If the problem persists, contact the administrator.")
        .setTimestamp();
        
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findCommand(commandName, commands, isOwner) {
  if (!commandName) return null;
  const normalizedName = normalizeText(commandName);
  
  return commands.find(cmd => {
    const nameMatches = normalizeText(cmd.name) === normalizedName || 
      (cmd.aliases && cmd.aliases.some(alias => normalizeText(alias) === normalizedName));
    
    const ownerRestricted = (cmd.category === 'owner' || cmd.category === "Owner" || cmd.settings?.isOwner !== false);
    
    return nameMatches && (!ownerRestricted || isOwner);
  });
}

function normalizeText(text) {
  if (!text) return '';
  return normalizeInput(mapNumericToAlphabetic(text));
}

function normalizeInput(input) {
  if (!input) return '';
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapNumericToAlphabetic(input) {
  if (!input) return '';
  const turkishAlphabet = 'abcçdefgğhıijklmnoöprsştuüvyz';
  const englishAlphabet = 'abcdefghijklmnopqrstuvwxyz';
  
  return input.split('').map(char => {
    if (/\d/.test(char)) {
      const num = parseInt(char, 10);
      return turkishAlphabet[num - 1] || englishAlphabet[num - 1] || char;
    }
    return char;
  }).join('');
}

function jaroWinklerSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  const maxDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  let match = 0;
  
  const matches1 = Array(len1).fill(false);
  const matches2 = Array(len2).fill(false);
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (!matches2[j] && s1[i] === s2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        match++;
        break;
      }
    }
  }
  
  if (match === 0) return 0.0;
  
  let transpose = 0;
  let j = 0;
  
  for (let i = 0; i < len1; i++) {
    if (matches1[i]) {
      while (!matches2[j]) j++;
      
      if (s1[i] !== s2[j]) transpose++;
      j++;
    }
  }
  
  const m = match;
  const t = transpose / 2;
  const jaro = ((m / len1) + (m / len2) + (m - t) / m) / 3;
  
  const p = 0.1;
  let l = 0;
  
  while (l < 4 && l < len1 && l < len2 && s1[l] === s2[l]) l++;
  
  return jaro + (l * p * (1 - jaro));
}

async function handleCommandPrerequisites(message, command) {
  const errorEmbed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTimestamp()
    .setFooter({ text: "If the problem persists please contact the administrator" });

  const isOwner = config.OWNERS.includes(message.author.id);
  
  if ((command.category === 'owner' || command.category === "Owner" || command.settings?.isOwner) && !isOwner) {
    errorEmbed.setTitle("🚫 Unauthorized Access")
      .setDescription("This command is only available to bot owners.");
    await message.reply({ embeds: [errorEmbed] });
    return false;
  }

  if (command.settings?.isDisabled && !isOwner) {
    errorEmbed.setTitle("🔒 Command Temporarily Disabled")
      .setDescription("This command is currently unavailable for maintenance or update. Please try again later.");
    await message.reply({ embeds: [errorEmbed] });
    return false;
  }

  if (command.settings?.isBeta === true && !isOwner) {
    errorEmbed.setTitle("🔒 Beta Feature")
      .setDescription('🚫 This command is only available to beta users!');
    await message.reply({ embeds: [errorEmbed] });
    return false;
  }

  if (command.userPerms && !message.member.permissions.has(PermissionsBitField.resolve(command.userPerms))) {
    errorEmbed.setTitle("🔐 Insufficient User Permission")
      .setDescription(`You need \`${command.userPerms}\` authorization to use this command.`);
    await message.reply({ embeds: [errorEmbed] });
    return false;
  }

  if (command.botPerms && !message.guild.members.me.permissions.has(PermissionsBitField.resolve(command.botPerms))) {
    errorEmbed.setTitle("⚠️ Bot Permission Error")
      .setDescription(`I need \`${command.botPerms}\` authorization to run this command.`);
    await message.reply({ embeds: [errorEmbed] });
    return false;
  }

  if (command.cooldown) {
    const commandName = command.name;
    const now = Date.now();
    const cooldownCollection = client.cooldowns.get(commandName) || new Collection();
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (cooldownCollection.has(message.author.id)) {
      const expirationTime = cooldownCollection.get(message.author.id) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        const cooldownEmbed = new EmbedBuilder()
          .setColor(config.COLORS.RED)
          .setTitle("⏳ Command Cooldown Active")
          .setDescription(`Please wait ${ms(timeLeft * 1000, { long: true })} before using this command again.`)
          .setFooter({ text: "Command cooldown is applied to prevent spam on the server." });
        await message.reply({ embeds: [cooldownEmbed]});
        return false;
      }
    }

    cooldownCollection.set(message.author.id, now);
    client.cooldowns.set(commandName, cooldownCollection);
    setTimeout(() => {
      cooldownCollection.delete(message.author.id);
      if (cooldownCollection.size === 0) {
        client.cooldowns.delete(commandName);
      }
    }, cooldownAmount);
  }

  return true;
}

async function executeCommand(client, message, command, args) {
  try {
    await command.run(client, message, args);
  } catch (error) {
    console.error(`Error executing command ${command.name}:`, error);
    const errorEmbed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle("❌ Command Execution Error")
      .setDescription("An unexpected error occurred while processing the command.")
      .addFields({ name: 'Error Detail', value: error.message || 'Unknown error' })
      .setTimestamp()
      .setFooter({ text: "Please report this error to the authorities." });
    
    message.reply({ embeds: [errorEmbed] }).catch(() => {});
  }
}