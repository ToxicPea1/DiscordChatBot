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
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Discord Clone Panel</title>

<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #313338;
  color: #dbdee1;
}

/* TOP BAR */
.topbar {
  height: 48px;
  background: #2b2d31;
  border-bottom: 1px solid #1e1f22;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
}

/* MAIN LAYOUT */
.layout {
  display: flex;
  height: calc(100vh - 48px);
}

/* CHAT */
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #313338;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.msg {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #5865f2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.msg-content {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: bold;
  color: #fff;
}

.text {
  color: #dbdee1;
}

.time {
  font-size: 11px;
  color: #949ba4;
}

/* INPUT */
.inputbar {
  display: flex;
  padding: 10px;
  background: #2b2d31;
  gap: 10px;
}

.inputbar input {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: none;
  background: #1e1f22;
  color: white;
}

.inputbar button {
  background: #5865f2;
  border: none;
  color: white;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
}

/* MEMBERS */
.members {
  width: 260px;
  background: #2b2d31;
  padding: 10px;
  overflow-y: auto;
  border-left: 1px solid #1e1f22;
}

.member {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 6px;
  border-radius: 6px;
}

.member:hover {
  background: #1e1f22;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3ba55c;
}

.member small {
  color: #949ba4;
  display: block;
  font-size: 11px;
}

.controls {
  display: flex;
  gap: 10px;
}

button {
  cursor: pointer;
}
@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }

  .members {
    position: fixed;
    right: 0;
    top: 48px;
    height: calc(100vh - 48px);
    width: 260px;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    z-index: 1000;
  }

  .members.open {
    transform: translateX(0);
  }

  .chat {
    width: 100%;
  }

  .topbar {
    justify-content: space-between;
  }
}
</style>
</head>

<body>

<div class="topbar">
  <div># general</div>
  <div class="controls">
    <button onclick="startBot()">Start</button>
    <button onclick="stopBot()">Stop</button>
  </div>
</div>

<div class="layout">

  <!-- CHAT -->
  <div class="chat">
    <div class="messages" id="chat"></div>

    <div class="inputbar">
      <input id="message" placeholder="Message..." />
      <button onclick="sendMessage()">Send</button>
    </div>
  </div>

  <!-- MEMBERS -->
  <div class="members">
    <input id="search" placeholder="Search members..." style="width:100%;margin-bottom:10px;padding:8px;border:none;border-radius:6px;background:#1e1f22;color:white;" />
    <div id="members"></div>
  </div>

</div>

<script>

async function startBot() {
  await fetch('/start', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ channelId: "1393951841238388816" }) });
  loadMessages();
  loadMembers();
}

async function stopBot() {
  await fetch('/stop', { method:'POST' });
}

async function sendMessage() {
  const message = document.getElementById('message').value;
  await fetch('/send', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ message })
  });
  document.getElementById('message').value = '';
}

async function loadMessages() {
  const res = await fetch('/messages');
  const data = await res.json();

  const chat = document.getElementById('chat');
  chat.innerHTML = data.messages.map(m => \`
    <div class="msg">
      <div class="avatar">\${m.author[0]?.toUpperCase() || "?"}</div>
      <div class="msg-content">
        <div class="name">\${escape(m.author)}</div>
        <div class="text">\${escape(m.content)}</div>
        <div class="time">\${escape(m.time)}</div>
      </div>
    </div>
  \`).join('');

  chat.scrollTop = chat.scrollHeight;
}

async function loadMembers() {
  const res = await fetch('/members');
  const data = await res.json();
  if (!data.ok) return;

  const search = document.getElementById('search').value.toLowerCase();

  const members = data.members.filter(m =>
    m.displayName.toLowerCase().includes(search)
  );

  document.getElementById('members').innerHTML = members.map(m => \`
    <div class="member">
      <div class="dot"></div>
      <div>
        <div>\${escape(m.displayName)}</div>
        <small>\${m.id}</small>
      </div>
    </div>
  \`).join('');
}

function escape(t) {
  return String(t).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

setInterval(loadMessages, 2000);
setInterval(loadMembers, 5000);

document.getElementById('search').addEventListener('input', loadMembers);
function toggleMembers() {
  document.querySelector('.members').classList.toggle('open');
}

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
        GatewayIntentBits.GuildMembers,
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
        time: new Date(msg.createdTimestamp).toLocaleString()
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
        time: new Date(msg.createdTimestamp).toLocaleString()
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
app.get('/members', async (req, res) => {
  try {
    if (!client || !connected) {
      return res.json({ ok: false, error: 'Bot is not running.' });
    }

    const channel = await client.channels.fetch(currentChannelId);

    if (!channel.guild) {
      return res.json({ ok:false, error:'Channel is not in a guild.' });
    }

    const guild = channel.guild;

    // Fetch all members
    await guild.members.fetch();

    const members = guild.members.cache
      .map(member => ({
        username: member.user.username,
        displayName: member.displayName,
        id: member.user.id,
        bot: member.user.bot
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    res.json({
      ok: true,
      guild: guild.name,
      count: members.length,
      members
    });

  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
