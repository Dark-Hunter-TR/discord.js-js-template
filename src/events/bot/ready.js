const { ActivityType } = require('discord.js');
const mongoose = require('mongoose');
const colors = require('colors');

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(colors.blue('✅ MongoDB Database Connection Established'));
    } catch (error) {
        console.error(colors.red('MongoDB Database Connection Error:'), error);
    }
}

function setCustomStatus(client) {
    client.user.setActivity({
        name: `Active`,
        type: ActivityType.Watching,
    });
}

module.exports = {
    name: 'ready',
    once: true,
    execute: async (client) => {
        try {
            await connectDatabase();
            setCustomStatus(client);
            console.log(colors.green(`✅ The bot successfully logged in as ${client.user.tag}!`));
        } catch (error) {
            console.error(colors.red('Ready event error:'), error);
        }
    }
};