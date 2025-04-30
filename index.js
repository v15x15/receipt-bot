const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', () => {
  console.log(`🤖 StockX Bot Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'stockx') return;

  try {
    const allowedChannelId = '1366732390919307316';
    const requiredRoleId = '1366762958339838073';

    if (interaction.channelId !== allowedChannelId) {
      await interaction.reply({ content: '🚫 Access Denied, Reason : Not a member', ephemeral: true });
      return;
    }

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      await interaction.reply({ content: '🚫 Access Denied, Reason : Missing required role', ephemeral: true });
      return;
    }

    const data = {
      image_url: interaction.options.getString('image_url'),
      image_click_link: interaction.options.getString('image_click_link'),
      item_title: interaction.options.getString('item_title'),
      item_size: interaction.options.getString('item_size'),
      item_condition: interaction.options.getString('item_condition'),
      order_number: interaction.options.getString('order_number'),
      price: interaction.options.getString('price'),
      tax: interaction.options.getString('tax'),
      processing_fee: interaction.options.getString('processing_fee'),
      shipping: interaction.options.getString('shipping'),
      total: interaction.options.getString('total'),
      delivery_date: interaction.options.getString('delivery_date'),
      email: interaction.options.getString('email')
    };

    await interaction.reply({ content: '🧾 Generating your receipt...', ephemeral: true });

    let html = fs.readFileSync(path.join(__dirname, 'email.html'), 'utf8');

    // Replace placeholders in email.html
    html = html.replace(/<span id="item-title"><\/span>/, data.item_title);
    html = html.replace(/<span id="item-size"><\/span>/, data.item_size);
    html = html.replace(/<span id="item-condition"><\/span>/, data.item_condition);
    html = html.replace(/<span id="order-number"><\/span>/, data.order_number);
    html = html.replace(/<span id="price"><\/span>/, data.price);
    html = html.replace(/<span id="tax"><\/span>/, data.tax);
    html = html.replace(/<span id="processing-fee"><\/span>/, data.processing_fee);
    html = html.replace(/<span id="shipping"><\/span>/, data.shipping);
    html = html.replace(/<span id="total"><\/span>/, data.total);
    html = html.replace(/<span id="delivery-date"><\/span>/, data.delivery_date);
    html = html.replace(/<img id="product-image"[^>]*src="[^"]*"/, `<img id="product-image" src="${data.image_url}"`);
    html = html.replace(/<a id="product-link"[^>]*href="[^"]*"/, `<a id="product-link" href="${data.image_click_link}"`);

    // Generate image from HTML
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    // Wait for image to load
    await page.waitForSelector('#product-image');
    await page.waitForFunction(() => {
      const img = document.querySelector('#product-image');
      return img && img.complete && img.naturalHeight !== 0;
    });

    const imagePath = './receipt.png';
    await page.screenshot({ path: imagePath, fullPage: true });
    await browser.close();

    // Email it
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"StockX" <email@verifiedventures.co>',
      replyTo: process.env.EMAIL_USER,
      to: data.email,
      subject: 'Your StockX order confirmation – Your StockX order has been delivered!',
      html: html
    });

    const attachment = new AttachmentBuilder(imagePath);
    await interaction.followUp({
      content: `✅ Receipt sent to **${data.email}**\n📎 Attached is your receipt:`,
      files: [attachment],
      ephemeral: false
    });
  } catch (err) {
    console.error("❌ Error generating or sending receipt:", err);
    await interaction.reply({
      content: "❌ Something went wrong while generating your receipt. Please try again.",
      ephemeral: true
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
