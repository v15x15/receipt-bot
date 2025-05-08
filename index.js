const express = require('express');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const dotenv = require('dotenv');
const sendEmail = require('./sendEmail');
const generateReceipt = require('./generateReceipt');
const showUsersBalance = require('./usersbalance');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

const tokenDB = {};

const stockxCommand = new SlashCommandBuilder()
  .setName('stockx')
  .setDescription('Generate and send a StockX receipt (costs 1 token)')
  .addStringOption(opt => opt.setName('image').setDescription('Image URL').setRequired(true))
  .addStringOption(opt => opt.setName('link').setDescription('Link URL').setRequired(true))
  .addStringOption(opt => opt.setName('title').setDescription('Item title').setRequired(true))
  .addStringOption(opt => opt.setName('size').setDescription('Item size').setRequired(true))
  .addStringOption(opt => opt.setName('condition').setDescription('Item condition').setRequired(true))
  .addStringOption(opt => opt.setName('ordernumber').setDescription('Order number').setRequired(true))
  .addStringOption(opt => opt.setName('price').setDescription('Price').setRequired(true))
  .addStringOption(opt => opt.setName('tax').setDescription('Tax').setRequired(true))
  .addStringOption(opt => opt.setName('fee').setDescription('Processing fee').setRequired(true))
  .addStringOption(opt => opt.setName('shipping').setDescription('Shipping').setRequired(true))
  .addStringOption(opt => opt.setName('total').setDescription('Total').setRequired(true))
  .addStringOption(opt => opt.setName('deliverydate').setDescription('Delivery date').setRequired(true))
  .addStringOption(opt => opt.setName('email').setDescription('Recipient email').setRequired(true));

const balanceCommand = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Check how many tokens you have');

const giveTokenCommand = new SlashCommandBuilder()
  .setName('givetoken')
  .setDescription('Give tokens to a user (only works in channel 1370066065488351395)')
  .addUserOption(opt => opt.setName('user').setDescription('User to give tokens to').setRequired(true))
  .addIntegerOption(opt => opt.setName('amount').setDescription('Number of tokens to give').setRequired(true))
  .setDMPermission(false);

const deleteMessageCommand = new SlashCommandBuilder()
  .setName('deletemessage')
  .setDescription('Delete a number of messages from a channel (admin only)')
  .addChannelOption(opt => opt.setName('channel').setDescription('Channel to delete messages from').setRequired(true))
  .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages to delete (0-100000)').setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .setDMPermission(false);

const usersBalanceCommand = new SlashCommandBuilder()
  .setName('usersbalance')
  .setDescription('Show all users and their token balances')
  .setDMPermission(false);

client.once('ready', async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: [stockxCommand, balanceCommand, giveTokenCommand, deleteMessageCommand, usersBalanceCommand],
    });
    console.log(`✅ Logged in as ${client.user.tag} and commands registered.`);
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  if (interaction.commandName === 'balance') {
    const balance = tokenDB[userId] || 0;
    await interaction.reply({ content: `💰 You have ${balance} token(s).`, ephemeral: true });
    return;
  }

  if (interaction.commandName === 'givetoken') {
    if (interaction.channelId !== '1370066065488351395') {
      await interaction.reply({ content: '❌ You can only use this command in the designated channel.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
      await interaction.reply({ content: '❌ Amount must be greater than 0.', ephemeral: true });
      return;
    }

    tokenDB[targetUser.id] = (tokenDB[targetUser.id] || 0) + amount;
    await interaction.reply(`✅ Gave ${amount} token(s) to <@${targetUser.id}>.`);
    return;
  }

  if (interaction.commandName === 'stockx') {
    const currentTokens = tokenDB[userId] || 0;

    if (currentTokens < 1) {
      await interaction.reply({ content: '❌ You do not have enough tokens to generate a receipt.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const inputs = {
      IMAGE_URL: interaction.options.getString('image'),
      IMAGE_CLICK_LINK: interaction.options.getString('link'),
      ITEM_TITLE: interaction.options.getString('title'),
      ITEM_SIZE: interaction.options.getString('size'),
      ITEM_CONDITION: interaction.options.getString('condition'),
      ORDER_NUMBER: interaction.options.getString('ordernumber'),
      PRICE: interaction.options.getString('price'),
      TAX: interaction.options.getString('tax'),
      PROCESSING_FEE: interaction.options.getString('fee'),
      SHIPPING: interaction.options.getString('shipping'),
      TOTAL: interaction.options.getString('total'),
      DELIVERY_DATE: interaction.options.getString('deliverydate'),
      email: interaction.options.getString('email'),
    };

    try {
      const htmlContent = await generateReceipt(inputs);
      await sendEmail(inputs.email, htmlContent);
      tokenDB[userId] -= 1;
      await interaction.editReply('✅ Receipt sent successfully! 1 token has been deducted.');
    } catch (error) {
      console.error('❌ Error processing /stockx command:', error);
      await interaction.editReply('❌ Failed to send the receipt.');
    }
    return;
  }

  if (interaction.commandName === 'deletemessage') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('channel');
    const amount = interaction.options.getInteger('amount');

    if (!channel.isTextBased()) {
      await interaction.reply({ content: '❌ That is not a valid text channel.', ephemeral: true });
      return;
    }

    if (amount < 1 || amount > 100000) {
      await interaction.reply({ content: '❌ Amount must be between 1 and 100000.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: `🧹 Deleting ${amount} messages...`, ephemeral: true });

    let deleted = 0;
    try {
      while (deleted < amount) {
        const toDelete = Math.min(100, amount - deleted);
        const messages = await channel.messages.fetch({ limit: toDelete });
        if (messages.size === 0) break;
        const deletedMessages = await channel.bulkDelete(messages, true);
        deleted += deletedMessages.size;
      }

      await interaction.editReply(`✅ Deleted ${deleted} message(s) from <#${channel.id}>.`);
    } catch (err) {
      console.error('❌ Error deleting messages:', err);
      await interaction.editReply('❌ Failed to delete messages. I might not have permission or messages are too old.');
    }
    return;
  }

  if (interaction.commandName === 'usersbalance') {
    if (interaction.channelId !== '1370066292739936366') {
      await interaction.reply({ content: '❌ This command can only be used in the designated channel.', ephemeral: true });
      return;
    }

    await showUsersBalance(interaction, client, tokenDB);
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);

// =======================
// Express Health Check Server
// =======================
const app = express();

// Basic health check endpoint
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Start the Express server on port 3000 (or environment-defined port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Pinger is live on port ${PORT}`);
});
