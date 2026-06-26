const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

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
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>Sehr Produktive lern webseite</title>
  <style>
    * {
      box-sizing: border-box;
      touch-action: manipulation;
    }
    body {
      font-family: "Whitney", "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: #313338;
      color: #dbdee1;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .input-group {
      background: #2b2d31;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #b5b6b8;
      margin-bottom: 6px;
    }

    input[type="text"] {
      width: 100%;
      padding: 12px;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 4px;
      color: #dbdee1;
      font-size: 14px;
    }
    input:focus {
      outline: none;
      border-color: #7289da;
    }

    button {
      padding: 12px 16px;
      background: #7289da;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #5b6eae;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }

    .chat-container {
      background: #2b2d31;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 80vh;
    }

    .chat-header {
      padding: 12px 16px;
      background: #313338;
      border-bottom: 1px solid #2b2d31;
      font-weight: 600;
      color: #f2f3f5;
    }

    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #313338;
      display: flex;
      flex-direction: column;
    }

    .msg {
      margin-bottom: 16px;
      padding: 8px 12px;
      background: #2b2d31;
      border-radius: 8px;
    }

    .msg .name {
      font-weight: 600;
      color: #f2f3f5;
      margin-bottom: 4px;
    }

    .msg .message-content {
      color: #dbdee1;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }

    .msg .meta {
      font-size: 11px;
      color: #949ba4;
      margin-top: 4px;
    }

    .msg .msgid {
      font-size: 11px;
      color: #949ba4;
      margin-top: 4px;
    }
    .message-input {
      padding: 12px;
      background: #2b2d31;
      display: flex;
      gap: 8px;
    }
    .msg .authorrow {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 4px;
      font-weight: 600;
      color: #f2f3f5;
      margin-bottom: 4px;
    }
    

    .message-input input {
      flex: 1;
      padding: 10px 12px;
      background: #1e1f22;
      border: none;
      border-radius: 8px;
      color: #dbdee1;
      font-size: 14px;
    }
    .message-input input:focus {
      outline: none;
    }

    .message-input button {
      padding: 10px 14px;
      margin: 0;
      min-width: 80px;
    }

    .status {
      font-size: 12px;
      color: #949ba4;
      margin-top: 6px;
    }
    .status.connected {
      color: #3ba55c;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="input-group">
      <label>Channel ID</label>
      <input id="channelId" type="text" value="1393951841238388816" placeholder="Channel ID" />

      <div class="row">
        <button onclick="startBot()">Start Bot</button>
        <button onclick="stopBot()" id="stopBtn" style="display:none; background: #4e5058;">Stop Bot</button>
      </div>

      <div class="status" id="status"></div>
    </div>

    <div class="chat-container">
      <div class="chat-header">Channel Messages</div>
      <div id="chat"></div>
      <div class="message-input">
        <input id="message" type="text" placeholder="Message @channel" onkeydown="if(event.key==='Enter') sendMessage()" />
        <button onclick="sendMessage()">Send</button>
      </div>
    </div>
  </div>

  <script>
    async function startBot() {
      const channelId = document.getElementById('channelId').value;
      if (!channelId) { alert('Please enter a channel ID.'); return; }

      const res = await fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('status').textContent = 'Bot Running';
        document.getElementById('status').classList.add('connected');
        document.getElementById('stopBtn').style.display = 'inline-block';
        loadMessages();
      } else {
        alert(data.error);
      }
    }

    async function stopBot() {
      const res = await fetch('/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('status').textContent = 'Bot Stopped';
        document.getElementById('status').classList.remove('connected');
        document.getElementById('stopBtn').style.display = 'none';
      } else {
        alert(data.error);
      }
    }

    async function sendMessage() {
      const input = document.getElementById('message');
      const message = input.value;
      if (!message) return;

      const res = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!data.ok) alert(data.error);
      input.value = '';
    }

    async function loadMessages() {
      const res = await fetch('/messages');
      const data = await res.json();
      const chat = document.getElementById('chat');
      
      // Only scroll if user hasn't scrolled up (preserve scroll position)
      const wasAtBottom = chat.scrollHeight - chat.scrollTop <= chat.clientHeight + 50;
      
      chat.innerHTML = data.messages.map(m => \`
        <div class="msg">
          <div class="message-content">\${escapeHtml(m.content)}</div>
          <div class="meta">\${escapeHtml(m.time)}</div>
          <div class="msgid">\${escapeHtml(m.messageid)}</div>
          <div class="authorrow">
            <div class="name">\${escapeHtml(m.author)}</div>
            <div class="authorid">\${escapeHtml(m.authorid)}</div>
          </div>
        </div>
      \`).join('');
      
      // Only scroll to bottom if user was already at bottom
      if (wasAtBottom) {
        chat.scrollTop = chat.scrollHeight;
      }
    }

    function escapeHtml(text) {
      return String(text).replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":\"&#39;\"
      }[m]));
    }

    setInterval(loadMessages, 2000);
  </script>
</body>
</html>
  `);
});

app.post('/start', async (req, res) => {
  try {
    if (!DISCORD_TOKEN) {
      return res.json({ ok: false, error: 'DISCORD_TOKEN is not set in Railway Variables.' });
    }

    console.log('Starting bot...');

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
      console.log(`✅ Bot connected as ${client.user.tag}`);
    });

    client.on('error', (err) => {
      console.error('❌ Bot error:', err);
    });

    client.on('messageCreate', (msg) => {
      if (msg.channel.id !== currentChannelId) return;
      messages.push({
        author: msg.author.bot ? `[Bot] ${msg.author.username}` : msg.author.username,
        content: msg.content || '[no text]',
        time: new Date(msg.createdTimestamp).toLocaleString(),
        messageid: msg.id,
        authorid: msg.author.id
      });
      if (messages.length > 100) messages.shift();
    });

    console.log('Logging in with token...');
    await client.login(DISCORD_TOKEN.trim());
    console.log('Login call completed');

    const channel = await client.channels.fetch(finalChannelId);
    if (!channel || !channel.isTextBased()) {
      console.error('Channel not found:', finalChannelId);
      return res.json({ ok: false, error: 'Channel not found or not text-based.' });
    }

    console.log('Fetching messages from channel...');
    const fetched = await channel.messages.fetch({ limit: 100 });
    console.log('Fetched', fetched.size, 'messages');

    const fetchedArray = Array.from(fetched.values());
    fetchedArray.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    for (const msg of fetchedArray) {
      messages.push({
        author: msg.author.bot ? `[Bot] ${msg.author.username}` : msg.author.username,
        content: msg.content || '[no text]',
        time: new Date(msg.createdTimestamp).toLocaleString(),
        messageid: msg.id,
        authorid: msg.author.id
      });
    }

    if (messages.length > 100) messages = messages.slice(0, 100);

    console.log('Bot started successfully, total messages:', messages.length);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Start error:', err);
    res.json({ ok: false, error: err.message });
  }
});

app.post('/stop', async (req, res) => {
  try {
    if (!client) return res.json({ ok: false, error: 'Bot is not running.' });
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
    if (!client || !connected) return res.json({ ok: false, error: 'Bot is not running.' });
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
