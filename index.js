const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

// Token from Railway environment variable
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEFAULT_CHANNEL_ID = "1393951841238388816";

if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN environment variable is not set.");
}

let client = null;
let connected = false;
let currentChannelId = DEFAULT_CHANNEL_ID;
let messages = [];

app.get('/', (req, res) => {
  res.send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Discord Chat Bot</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 20px auto; padding: 0 12px; }
    input, button { width: 100%; padding: 10px; margin: 6px 0 12px; box-sizing: border-box; }
    #chat { height: 420px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #fafafa; }
    .msg { margin-bottom: 10px; }
    .name { font-weight: bold; }
    .meta { font-size: 12px; color: #666; }
    .row { display: grid; grid-template-columns: 1fr; gap: 12px; }
  </style>
</head>
<body>
  <h2>Discord Chat Bot</h2>

  <label>Channel ID</label>
  <input id="channelId" type="text" value="1393951841238388816" placeholder="Channel ID" />

  <div class="row">
    <button onclick="connectBot()">Connect Bot</button>
    <button onclick="disconnectBot()" id="disconnectBtn" style="display:none;">Disconnect Bot</button>
  </div>

  <label>Message</label>
  <input id="message" type="text" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendMessage()" />
  <button onclick="sendMessage()">Send Message</button>

  <h3>Messages</h3>
  <div id="chat"></div>

  <script>
    async function connectBot() {
      const channelId = document.getElementById('channelId').value;
      if (!channelId) { alert('Please enter a channel ID.'); return; }

      const res = await fetch('/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Connected');
        document.getElementById('disconnectBtn').style.display = 'inline-block';
      } else {
        alert(data.error);
      }
    }

    async function disconnectBot() {
      const res = await fetch('/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      alert(data.ok ? 'Disconnected' : data.error);
      document.getElementById('disconnectBtn').style.display = 'none';
    }

    async function sendMessage() {
      const message = document.getElementById('message').value;
      const res = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!data.ok) alert(data.error);
      document.getElementById('message').value = '';
    }

    async function loadMessages() {
      const res = await fetch('/messages');
      const data = await res.json();
      const chat = document.getElementById('chat');
      chat.innerHTML = data.messages.map(m => \`
        <div class="msg">
          <div class="name">\${escapeHtml(m.author)}</div>
          <div>\${escapeHtml(m.content)}</div>
          <div class="meta">\${escapeHtml(m.time)}</div>
        </div>
      \`).join('');
      chat.scrollTop = chat.scrollHeight;
    }

    function escapeHtml(text) {
      return String(text).replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":\"&#39;\"
      }[m]));
    }

    setInterval(loadMessages, 2000);
    loadMessages();
  </script>
</body>
</html>
  `);
});

app.post('/connect', async (req, res) => {
  try {
    if (!DISCORD_TOKEN) {
      return res.json({ ok: false, error: 'DISCORD_TOKEN is not set in Railway Variables.' });
    }

    const { channelId } = req.body;
    const finalChannelId = channelId || DEFAULT_CHANNEL_ID;

    currentChannelId = finalChannelId;
    messages = [];

    if (client) {
      try { await client.destroy(); } catch {}
    }

    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });

    client.once('ready', () => {
      connected = true;
      console.log(`Logged in as ${client.user.tag}`);
    });

    client.on('messageCreate', (msg) => {
      if (msg.channel.id !== currentChannelId) return;
      messages.push({
        author: msg.author.bot ? `[Bot] ${msg.author.username}` : msg.author.username,
        content: msg.content || '[no text]',
        time: new Date(msg.createdTimestamp).toLocaleString()
      });
      if (messages.length > 100) messages.shift();
    });

    await client.login(DISCORD_TOKEN.trim());
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/disconnect', async (req, res) => {
  try {
    if (!client) return res.json({ ok: false, error: 'Bot is not connected.' });
    await client.destroy();
    client = null;
    connected = false;
    messages = [];
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/send', async (req, res) => {
  try {
    if (!client || !connected) return res.json({ ok: false, error: 'Bot is not connected.' });
    const { message } = req.body;
    if (!message) return res.json({ ok: false, error: 'Message is empty.' });

    const channel = await client.channels.fetch(currentChannelId);
    if (!channel || !channel.isTextBased()) return res.json({ ok: false, error: 'Channel not found or not text-based.' });

    await channel.send(message);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/messages', (req, res) => {
  res.json({ messages });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
