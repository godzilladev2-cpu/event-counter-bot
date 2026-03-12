const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

// Load secrets from environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const GUILD_ID = process.env.GUILD_ID;

// Google Sheets authentication using env variable
const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Detect quota messages
  if (message.content.includes("Name:") && message.content.includes("Quota:")) {
    try {
      // Example: parse "Name: John, Quota: 5"
      const nameMatch = message.content.match(/Name:\s*(\w+)/i);
      const quotaMatch = message.content.match(/Quota:\s*(\d+)/i);

      if (nameMatch && quotaMatch) {
        const name = nameMatch[1];
        const quota = parseInt(quotaMatch[1], 10);

        // Update Google Sheet (first sheet, row append)
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: "Sheet1!A:B",
          valueInputOption: "RAW",
          requestBody: {
            values: [[name, quota]]
          }
        });

        await message.react("✅");
        console.log(`Updated sheet with ${name} - ${quota}`);
      }
    } catch (err) {
      console.error("Error updating sheet:", err);
      await message.react("❌");
    }
  }
});

client.login(DISCORD_TOKEN);
