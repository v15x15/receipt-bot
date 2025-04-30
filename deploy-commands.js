const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('stockx')
    .setDescription('Generate a StockX receipt and email it')
    .addStringOption(opt => opt.setName('image_url').setDescription('Image URL').setRequired(true))
    .addStringOption(opt => opt.setName('image_click_link').setDescription('Image Click Link').setRequired(true))
    .addStringOption(opt => opt.setName('item_title').setDescription('Item Title').setRequired(true))
    .addStringOption(opt => opt.setName('item_size').setDescription('Item Size').setRequired(true))
    .addStringOption(opt => opt.setName('item_condition').setDescription('Item Condition').setRequired(true))
    .addStringOption(opt => opt.setName('order_number').setDescription('Order Number').setRequired(true))
    .addStringOption(opt => opt.setName('price').setDescription('Price').setRequired(true))
    .addStringOption(opt => opt.setName('tax').setDescription('Tax').setRequired(true))
    .addStringOption(opt => opt.setName('processing_fee').setDescription('Processing Fee').setRequired(true))
    .addStringOption(opt => opt.setName('shipping').setDescription('Shipping').setRequired(true))
    .addStringOption(opt => opt.setName('total').setDescription('Total').setRequired(true))
    .addStringOption(opt => opt.setName('delivery_date').setDescription('Delivery Date').setRequired(true))
    .addStringOption(opt => opt.setName('email').setDescription('Your Email Address').setRequired(true))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const CLIENT_ID = '1366736244478054400';
const GUILD_ID = '1366732390483103814';

rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
)
  .then(() => console.log('✅ Slash command updated (image_title removed).'))
  .catch(console.error);
