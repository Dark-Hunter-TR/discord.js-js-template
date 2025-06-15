const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: "ping",
        description: "Check the bot's latency and API response time.",
        options: []
    },
    settings: {
        isOwner: false,
        isBeta: false,
        isDisabled: false,
        cooldown: 5,
    },
    run: async (client, interaction) => {
        const apiPing = client.ws.ping;
        const embed = new EmbedBuilder()
            .setColor(client.config.COLORS.BLUE)
            .setTitle("🏓 Pong!")
            .setDescription(`API Latency: **${apiPing}ms**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};