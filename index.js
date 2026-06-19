const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

let client = null;
let connected = false;
let currentChannelId = '';
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
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  </style>
</head>
<body>
  <h2>Discord Bot Chat</h2>

  <label>Bot Token</label>
  <input id="token" type="password" placeholder="Paste bot token here" />

  <div class="row">
    <div>
      <label>Channel ID</label>
      <input id="channelId" type="text" placeholder="Paste channel ID here" />
    </div>
    <div style="align-self:end;">
      <button onclick="connectBot()">Connect Bot</button>
    </div>
  </div>

  <label>Message</label>
  <input id="message" type="text" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendMessage()" />
  <button onclick="sendMessage()">Send Message</button>

  <h3>Messages</h3>
  <div id="chat"></div>

  <script>
    async function connectBot() {
      const token = document.getElementById('token').value;
      const channelId = document.getElementById('channelId').value;
      const res = await fetch('/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, channelId })
      });
      const data = await res.json();
      alert(data.ok ? 'Connected' : data.error);
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
    const { token, channelId } = req.body;
    if (!token || !channelId) return res.json({ ok: false, error: 'Token and Channel ID are required.' });

    currentChannelId = channelId;
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

    await client.login(token.trim());
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

app.listen(3000, () => console.log('Open http://localhost:3000'));
