const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// Environment variables from Railway
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const GUILD_ID = process.env.GUILD_ID;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Event-logs channel ID
const EVENT_LOG_CHANNEL_ID = "1348377028654796914";

let loggingEnabled = false;

// Google Sheets setup
const auth = new GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Enable/disable commands
  if (message.content === "!enable-logs") {
    loggingEnabled = true;
    await message.reply("Event logging enabled ✅");
    return;
  }
  if (message.content === "!disable-logs") {
    loggingEnabled = false;
    await message.reply("Event logging disabled ❌");
    return;
  }

  // Only allow in event-logs channel
  if (message.channel.id !== EVENT_LOG_CHANNEL_ID) return;

  // Only run if logging is enabled
  if (!loggingEnabled) return;

  // Detect quota messages
  if (message.content.includes("Name:") && message.content.includes("Quota:")) {
    try {
      // Example: "Name: Dev, Quota: 5"
      const parts = message.content.split(",");
      const name = parts[0].split("Name:")[1].trim();
      const quota = parts[1].split("Quota:")[1].trim();

      // Append to Google Sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "Sheet1!A:B",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[name, quota]]
        }
      });

      // React with tick
      await message.react("✅");
    } catch (err) {
      console.error("Error logging to sheet:", err);
      await message.reply("⚠️ Failed to log entry.");
    }
  }
});

client.login(DISCORD_TOKEN);
