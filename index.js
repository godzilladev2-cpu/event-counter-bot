// index.js

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

// Load Google credentials using absolute path
const auth = new GoogleAuth({
  keyFile: 'C:\\Users\\godzi\\Downloads\\event-counter-bot\\credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Your actual values
const DISCORD_TOKEN = 'MTQ4MTM3MTAwMzYyMzA1MTQ3OA.GviZWk.CBdh35hWu1wMYP5lF-PbRjqhFk8j3gZKBygkdc';
const SHEET_ID = '1S2kKRJd6zsU9w9AfezawNBxJYmCFsFfQP0x09cYN8YQ';
const GUILD_ID = '949833568840982588';

// Variable to store enabled channel
let enabledChannel = null;

// Ready event
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Register slash command (/enable) instantly in your server
client.on('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName('enable')
      .setDescription('Enable the bot in this channel')
      .toJSON()
  ];

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('Slash command /enable registered instantly.');
  } catch (err) {
    console.error('Error registering slash command:', err);
  }
});

// Handle slash command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'enable') {
    enabledChannel = interaction.channel.id;
    await interaction.reply(`✅ Bot enabled in ${interaction.channel.name}`);
  }
});

// Message handler
client.on('messageCreate', async (message) => {
  if (!enabledChannel || message.channel.id !== enabledChannel) return;

  const nameMatch = message.content.match(/Name:\s*(.+)/);
  const quotaMatch = message.content.match(/Quota:\s*(\d+)\/(\d+)/);

  if (nameMatch && quotaMatch) {
    const name = nameMatch[1].trim();
    const quota = parseInt(quotaMatch[1], 10);

    console.log({ name, quota });

    try {
      const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: '8th Wing Personnel!C:C' // Username column
      });

      const rows = res.data.values;
      const rowIndex = rows.findIndex(r => r[0] === name);

      if (rowIndex !== -1) {
        const updateRange = `8th Wing Personnel!J${rowIndex + 1}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: updateRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[quota]] // only quota goes into column J
          }
        });

        await message.react('✅');
      } else {
        console.log(`Name ${name} not found in sheet`);
      }
    } catch (err) {
      console.error('Error updating sheet:', err);
    }
  }
});

// Login
client.login(DISCORD_TOKEN);
