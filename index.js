const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const EVENT_LOG_CHANNEL_ID = "1348377028654796914";
let loggingEnabled = false;

const auth = new GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

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

  if (message.channel.id !== EVENT_LOG_CHANNEL_ID) return;
  if (!loggingEnabled) return;

  const lines = message.content.split("\n");
  const nameLine = lines.find(l => l.toLowerCase().startsWith("name:"));
  const quotaLine = lines.find(l => l.toLowerCase().startsWith("quota:"));
  if (!nameLine || !quotaLine) return;

  try {
    const name = nameLine.split(":")[1].trim();

    // ✅ Only take the first number before the slash
    const quotaRaw = quotaLine.split(":")[1].trim();
    const quota = quotaRaw.split("/")[0].trim();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'8th Wing Personnel'!C1:C500"  // usernames in column C
    });

    const rows = res.data.values || [];
    let targetRow = null;

    rows.forEach((row, idx) => {
      if (row[0] && row[0].trim().toLowerCase() === name.toLowerCase()) {
        targetRow = idx + 1; // Sheets rows are 1-indexed
      }
    });

    if (targetRow) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'8th Wing Personnel'!J${targetRow}`, // quotas in column J
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[quota]] }
      });
      await message.react("✅");
    } else {
      await message.reply(`⚠️ Username "${name}" not found in column C.`);
    }
  } catch (err) {
    console.error("Error logging to sheet:", err);
    await message.reply("⚠️ Failed to log entry.");
  }
});

client.login(DISCORD_TOKEN);
