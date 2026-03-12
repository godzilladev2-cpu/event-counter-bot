const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// Environment variables from Railway
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
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

// Use clientReady instead of ready (Discord.js v15+)
client.once('clientReady', () => {
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

  // Split into lines and detect Name + Quota
  const lines = message.content.split("\n");
  const nameLine = lines.find(l => l.startsWith("Name:"));
  const quotaLine = lines.find(l => l.startsWith("Quota:"));

  if (nameLine && quotaLine) {
    try {
      const name = nameLine.replace("Name:", "").trim();
      const quota = quotaLine.replace("Quota:", "").trim();

      // Get all values in column C (usernames)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "Database!C:C"   // adjust tab name if not "Database"
      });

      const rows = res.data.values || [];
      let targetRow = null;

      rows.forEach((row, idx) => {
        if (row[0] && row[0].trim() === name) {
          targetRow = idx + 1; // +1 because rows are 1-indexed in Sheets
        }
      });

      if (targetRow) {
        // Update column J in the same row
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Database!J${targetRow}`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [[quota]]
          }
        });

        await message.react("✅");
      } else {
        await message.reply(`⚠️ Username "${name}" not found in column C.`);
      }
    } catch (err) {
      console.error("Error logging to sheet:", err);
      await message.reply("⚠️ Failed to log entry.");
    }
  }
});

client.login(DISCORD_TOKEN);
