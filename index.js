require('dotenv').config(); // Load .env variables

const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

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
      return interaction.reply({ content: '🚫 Access Denied, Reason : Not a member', ephemeral: true });
    }

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return interaction.reply({ content: '🚫 Access Denied, Reason : Missing required role', ephemeral: true });
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

    // Replace placeholders
    html = html.replace(/<span id="item-title"><\/span>/, data.item_title)
      .replace(/<span id="item-size"><\/span>/, data.item_size)
      .replace(/<span id="item-condition"><\/span>/, data.item_condition)
      .replace(/<span id="order-number"><\/span>/, data.order_number)
      .replace(/<span id="price"><\/span>/, data.price)
      .replace(/<span id="tax"><\/span>/, data.tax)
      .replace(/<span id="processing-fee"><\/span>/, data.processing_fee)
      .replace(/<span id="shipping"><\/span>/, data.shipping)
      .replace(/<span id="total"><\/span>/, data.total)
      .replace(/<span id="delivery-date"><\/span>/, data.delivery_date)
      .replace(/<img id="product-image"[^>]*src="[^"]*"/, `<img id="product-image" src="${data.image_url}"`)
      .replace(/<a id="product-link"[^>]*href="[^"]*"/, `<a id="product-link" href="${data.image_click_link}"`);

    // Generate screenshot
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    await page.waitForSelector('#product-image');
    await page.waitForFunction(() => {
      const img = document.querySelector('#product-image');
      return img && img.complete && img.naturalHeight !== 0;
    });

    const imagePath = './receipt.png';
    await page.screenshot({ path: imagePath, fullPage: true });
    await browser.close();

    // Email setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"StockX" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: data.email,
      subject: 'Your StockX order confirmation – Your StockX order has been delivered!',
      html: html,
      attachments: [{
        filename: 'receipt.png',
        path: imagePath,
        cid: 'receipt@stockx'
      }]
    });

    const attachment = new AttachmentBuilder(imagePath);

    await interaction.followUp({
      content: `✅ Receipt sent to **${data.email}**\n📎 Attached is your receipt:`,
      files: [attachment],
      ephemeral: false
    });

  } catch (err) {
    console.error("❌ Error generating or sending receipt:", err);

    try {
      await interaction.followUp({
        content: "❌ Something went wrong while generating your receipt. Please try again.",
        ephemeral: true
      });
    } catch (fallbackError) {
      console.error("❗ Also failed to reply with error message:", fallbackError);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
