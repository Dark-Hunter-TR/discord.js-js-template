# Discord Bot Template

A comprehensive Discord bot template built with Discord.js v14, featuring both prefix and slash command support.

## Features

- **Dual Command System**: Support for both prefix commands and Discord's slash commands
- **Event Handler**: Organized event management system
- **Command Handler**: Efficient command processing with cooldown management
- **MongoDB Support**: Database integration with Mongoose
- **Modular Structure**: Well-organized directory structure for easy maintenance and scalability

## Tech Stack

- Node.js
- Discord.js v14
- MongoDB (Mongoose)
- dotenv for environment variable management

## Project Structure

```
├── index.js                # Main bot entry point
├── src/                    # Source code directory
│   ├── commands/           # Bot commands
│   │   ├── prefix/         # Traditional prefix commands
│   │   └── slash/          # Discord slash commands
│   ├── configs/            # Configuration files
│   ├── events/             # Event handlers
│   │   ├── bot/            # Discord bot events
│   ├── handlers/           # System handlers
│   ├── classes/            # Custom classes
│   ├── functions/          # Utility functions
│   ├── schemas/            # MongoDB schemas
│   └── utils/              # Utility modules
```

## Installation

1. Clone this repository
2. Install dependencies
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   BOT_TOKEN=your_discord_bot_token
   BOT_ID=your_discord_bot_id
   MONGODB_URI=your_mongodb_connection_string
   ```
4. Configure the bot in `src/configs/bot.js`

## Usage

Start the bot with:

```
node index.js
```

### Adding Commands

#### Prefix Commands
Place your command files in `src/commands/prefix/` directory.

#### Slash Commands
Place your slash command files in `src/commands/slash/` directory.

## Configuration

Edit the configuration in `src/configs/bot.js`:

- `PREFIX`: Default command prefix (e.g., "!")
- `COLORS`: Theme colors for embeds
- `EMOJIS`: Emojis used in responses
- `OWNERS`: Bot owner IDs for privileged commands

## License

Apache 2.0

## Author

- Dark-Hunter-TR 
