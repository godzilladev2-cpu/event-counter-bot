const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const { google } = require("googleapis");
const { JWT } = require("google-auth-library");

const app = express();
app.use(express.json());

// Discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
client.login(process.env.DISCORD_TOKEN);

// Google Auth setup
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const jwtClient = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/documents"
  ]
});

const drive = google.drive({ version: "v3", auth: jwtClient });
const docs = google.docs({ version: "v1", auth: jwtClient });

// Function to generate report from template
async function generateReport(questions) {
  // Copy template
  const copy = await drive.files.copy({
    fileId: process.env.DOC_TEMPLATE_ID,
    requestBody: { name: `Report-${Date.now()}` }
  });
  const docId = copy.data.id;

  // Replace placeholders {{Q1}}, {{Q2}}, etc.
  const requests = Object.entries(questions).map(([q, a], i) => ({
    replaceAllText: {
      containsText: { text: `{{Q${i+1}}}`, matchCase: true },
      replaceText: a[0]
    }
  }));

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });

  // Export PDF
  const pdf = await drive.files.export(
    { fileId: docId, mimeType: "application/pdf" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(pdf.data);
}

// Webhook endpoint for form submissions
app.post("/form-submit", async (req, res) => {
  try {
    const { questions } = req.body;

    // Format message
    let message = "**Bi-Weekly Wing Report Submission**\n";
    for (const [q, a] of Object.entries(questions)) {
      message += `**${q}**: ${a[0]}\n`;
    }

    // Send to Discord channel
    const channel = await client.channels.fetch(process.env.FORM_CHANNEL_ID);

    // Generate PDF report
    const pdfBuffer = await generateReport(questions);

    // Send message + attach PDF
    await channel.send({
      content: message,
      files: [{ attachment: pdfBuffer, name: "report.pdf" }]
    });

    res.status(200).send("Form processed");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing form");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Form handler running");
});
