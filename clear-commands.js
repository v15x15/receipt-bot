const { REST, Routes } = require('discord.js');
require('dotenv').config();

const CLIENT_ID = '1366736244478054400';           // Your bot's application ID
const GUILD_ID = '1366732390483103814';            // Your Discord server ID

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const commands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    if (!commands.length) {
      console.log('ℹ️ No commands to delete.');
      return;
    }

    await Promise.all(commands.map(cmd =>
      rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, cmd.id))
    ));

    console.log('✅ All guild slash commands deleted.');
  } catch (error) {
    console.error('❌ Failed to delete commands:', error);
  }
})();
