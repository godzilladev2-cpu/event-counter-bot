const express = require("express");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

// Debug check for Railway variables
console.log("Sheet ID:", process.env.SHEET_ID ? "Loaded" : "Missing");
console.log("Google Credentials:", process.env.GOOGLE_CREDENTIALS ? "Loaded" : "Missing");

// Discord bot setup
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Google Sheets logging function
async function logToSheet(data) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    const sheets = google.sheets({ version: "v4", auth });
    console.log("Attempting to log to Sheets with data:", data);
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: "Logs!A1",
      valueInputOption: "RAW",
      resource: {
        values: [[new Date().toISOString(), JSON.stringify(data)]]
      }
    });

    console.log("✅ Logged data to Google Sheets");
  } catch (err) {
    console.error("❌ Failed to log to Sheets:", err.message);
  }
}

// Webhook endpoint for Google Form submissions
app.post("/form-webhook", async (req, res) => {
  const data = req.body;

  // Log to Sheets
  await logToSheet(data);

  // Send to Discord channel
  const channel = client.channels.cache.get("949833571240116314");
  if (channel) {
    channel.send(`📋 New Form Submission:\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``);
  }

  res.sendStatus(200);
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});

// Login Discord bot
client.login(process.env.DISCORD_TOKEN);
