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
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>Discord Chat Bot</title>
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

    input[type="text"],
    input[type="password"] {
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
    button:disabled {
      background: #4e5058;
      cursor: not-allowed;
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

    .msg .gif-preview {
      margin-top: 8px;
      max-width: 300px;
      border-radius: 8px;
    }

    .msg .meta {
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

    .gif-btn {
      padding: 10px 14px;
      background: #faa61a;
      min-width: 80px;
    }
    .gif-btn:hover {
      background: #e59416;
    }

    .status {
      font-size: 12px;
      color: #949ba4;
      margin-top: 6px;
    }
    .status.connected {
      color: #3ba55c;
    }

    /* User suggestion box */
    .suggestions {
      position: absolute;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
    }
    .suggestion-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: #dbdee1;
    }
    .suggestion-item:hover {
      background: #7289da;
      color: #fff;
    }
    .message-input-wrapper {
      position: relative;
    }

    /* GIF Modal */
    .gif-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 2000;
      display: none;
      justify-content: center;
      align-items: center;
    }
    .gif-modal.active {
      display: flex;
    }
    .gif-content {
      background: #2b2d31;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .gif-header {
      padding: 16px;
      background: #313338;
      border-bottom: 1px solid #2b2d31;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gif-header h3 {
      margin: 0;
      font-size: 18px;
      color: #f2f3f5;
    }
    .close-gif {
      padding: 8px 12px;
      background: #747f8d;
      font-size: 12px;
    }
    .close-gif:hover {
      background: #5e6674;
    }
    .gif-search {
      padding: 12px 16px;
      background: #2b2d31;
      border-bottom: 1px solid #1e1f22;
    }
    .gif-search input {
      width: 100%;
      padding: 12px;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 8px;
      color: #dbdee1;
      font-size: 14px;
    }
    .gif-search input:focus {
      outline: none;
      border-color: #7289da;
    }
    .gif-grid {
      padding: 16px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .gif-item {
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      background: #1e1f22;
    }
    .gif-item:hover {
      transform: scale(1.02);
    }
    .gif-item img {
      width: 100%;
      height: 120px;
      object-fit: cover;
      display: block;
    }
    .gif-item .gif-title {
      padding: 8px;
      font-size: 12px;
      color: #dbdee1;
      word-break: break-word;
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
        <button class="gif-btn" onclick="openGifModal()">🎬 GIF</button>
        <div class="message-input-wrapper">
          <input id="message" type="text" placeholder="Message @channel" oninput="handleInput()" onkeydown="handleKeyDown(event)" />
          <div id="suggestions" class="suggestions" style="display:none;"></div>
        </div>
        <button onclick="sendMessage()">Send</button>
      </div>
    </div>
  </div>

  <!-- GIF Modal -->
  <div id="gifModal" class="gif-modal">
    <div class="gif-content">
      <div class="gif-header">
        <h3>Search GIFs</h3>
        <button class="close-gif" onclick="closeGifModal()">Close</button>
      </div>
      <div class="gif-search">
        <input id="gifSearch" type="text" placeholder="Search GIFs..." oninput="searchGifs()" />
      </div>
      <div id="gifGrid" class="gif-grid"></div>
    </div>
  </div>

  <script>
    let userIndex = -1;
    let currentSuggestions = [];
    let currentGifs = [];
    let channelMembers = [];

    const featuredGifs = [
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6bW55Z3R5cDZxejJxejJxejJxejJxejJxejJxejJxejJx/cmpvPsBtK5JHvAZCco/giphy.gif', title: 'Hello' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6bW55Z3R5cDZxejJxejJxejJxejJxejJxejJxejJxejJxejJx/3o7aD2saalBwwftBIY/giphy.gif', title: 'Laugh' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6bW55Z3R5cDZxejJxejJxejJxejJxejJxejJxejJxejJxejJx/l0HlHFRbmaZtBRhXG/giphy.gif', title: 'Cool' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6bW55Z3R5cDZxejJxejJxejJxejJxejJxejJxejJxejJxejJxejJx/xT0xeJpGU534Imz28w/giphy.gif', title: 'Happy' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6bW55Z3R5cDZxejJxejJxejJxejJxejJxejJxejJxejJxejJxejJx/26BRv0ThflsHCqDrG/giphy.gif', title: 'Funny' },
      { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3R6bW55Z3R5cDZxejJxejJxejJxejJxejJxejJxejJxejJxejJxejJx/3o6Zt6ML6BklcajjsA/giphy.gif', title: 'Love' }
    ];

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
      hideSuggestions();
    }

    async function loadMessages() {
      const res = await fetch('/messages');
      const data = await res.json();
      const chat = document.getElementById('chat');
      chat.innerHTML = data.messages.map(m => {
        let contentHTML = escapeHtml(m.content);
        let gifHTML = '';

        const gifMatch = m.content.match(/(https?:\/\/[^"\\s]+\.(gif|gifv))/);
        if (gifMatch) {
          gifHTML = \`<img class="gif-preview" src="\${gifMatch[0]}" alt="GIF">\\n\`;
        }

        return \`
          <div class="msg">
            <div class="name">\${escapeHtml(m.author)}</div>
            <div class="message-content">\${contentHTML}</div>
            \${gifHTML}
            <div class="meta">\${escapeHtml(m.time)}</div>
          </div>
        \`;
      }).join('');
      chat.scrollTop = chat.scrollHeight;
    }

    function openGifModal() {
      document.getElementById('gifModal').classList.add('active');
      loadFeaturedGifs();
    }

    function closeGifModal() {
      document.getElementById('gifModal').classList.remove('active');
      document.getElementById('gifSearch').value = '';
      currentGifs = [];
    }

    function loadFeaturedGifs() {
      currentGifs = featuredGifs;
      renderGifs();
    }

    async function searchGifs() {
      const query = document.getElementById('gifSearch').value.trim();
      if (!query) {
        loadFeaturedGifs();
        return;
      }

      try {
        const res = await fetch(\`https://api.giphy.com/v1/gifs/search?api_key=dj0bYqJF8V5E8QqhJqFCW8Z5DXhF1qGq&query=\${encodeURIComponent(query)}&limit=12&rating=g\`);
        const data = await res.json();
        currentGifs = data.data.map(g => ({
          url: g.images.fixed_height.url,
          title: g.title
        }));
        renderGifs();
      } catch (err) {
        console.error('GIF search error:', err);
        loadFeaturedGifs();
      }
    }

    function renderGifs() {
      const grid = document.getElementById('gifGrid');
      if (currentGifs.length === 0) {
        grid.innerHTML = '<div style="padding:16px;color:#949ba4;">No GIFs found</div>';
        return;
      }

      grid.innerHTML = currentGifs.map(g => \`
        <div class="gif-item" onclick="selectGif('\${g.url}', '\${escapeHtml(g.title)}')">
          <img src="\${g.url}" alt="\${escapeHtml(g.title)}">
          <div class="gif-title">\${escapeHtml(g.title)}</div>
        </div>
      \`).join('');
    }

    function selectGif(url, title) {
      const input = document.getElementById('message');
      const message = title ? \`\${title} \${url}\` : url;
      input.value = message;
      closeGifModal();
    }

    function handleInput() {
      const input = document.getElementById('message');
      const value = input.value;
      const pos = input.selectionStart;

      const lastAtIndex = value.lastIndexOf('@', pos - 1);
      if (lastAtIndex === -1) {
        hideSuggestions();
        return;
      }

      const afterAt = value.slice(lastAtIndex + 1, pos);
      if (afterAt.length === 0) {
        showAllSuggestions();
      } else {
        filterSuggestions(afterAt);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'ArrowDown') {
        if (currentSuggestions.length > 0) {
          userIndex = (userIndex + 1) % currentSuggestions.length;
          highlightSuggestion(userIndex);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        if (currentSuggestions.length > 0) {
          userIndex = (userIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
          highlightSuggestion(userIndex);
        }
        return;
      }

      if (event.key === 'Enter' && currentSuggestions.length > 0) {
        if (userIndex >= 0) {
          const user = currentSuggestions[userIndex];
          insertPing(document.getElementById('message'), user);
        }
        hideSuggestions();
        return;
      }

      if (event.key === 'Escape') {
        hideSuggestions();
        return;
      }
    }

    function showAllSuggestions() {
      const suggestionsEl = document.getElementById('suggestions');
      suggestionsEl.innerHTML = channelMembers.map(u => \`
        <div class="suggestion-item" data-userid="\${u.id}" data-username="\${u.username}">
          @\${escapeHtml(u.username)}
        </div>
      \`).join('');
      suggestionsEl.style.display = 'block';
      userIndex = 0;
      highlightSuggestion(0);
    }

    function filterSuggestions(text) {
      const filtered = channelMembers.filter(u =>
        u.username.toLowerCase().includes(text.toLowerCase())
      );
      currentSuggestions = filtered;

      const suggestionsEl = document.getElementById('suggestions');
      if (filtered.length === 0) {
        suggestionsEl.style.display = 'none';
        return;
      }

      suggestionsEl.innerHTML = filtered.map(u => \`
        <div class="suggestion-item" data-userid="\${u.id}" data-username="\${u.username}">
          @\${escapeHtml(u.username)}
        </div>
      \`).join('');
      suggestionsEl.style.display = 'block';
      userIndex = 0;
      highlightSuggestion(0);
    }

    function highlightSuggestion(index) {
      const items = document.querySelectorAll('.suggestion-item');
      items.forEach((item, i) => {
        if (i === index) {
          item.style.background = '#7289da';
          item.style.color = '#fff';
        } else {
          item.style.background = '';
          item.style.color = '';
        }
      });
    }

    function hideSuggestions() {
      const suggestionsEl = document.getElementById('suggestions');
      suggestionsEl.style.display = 'none';
      currentSuggestions = [];
      userIndex = -1;
    }

    function insertPing(input, user) {
      const value = input.value;
      const pos = input.selectionStart;

      const lastAtIndex = value.lastIndexOf('@', pos - 1);
      if (lastAtIndex === -1) return;

      const before = value.slice(0, lastAtIndex);
      const discordPing = \`<@\${user.id}>\`;
      const after = value.slice(pos);

      input.value = before + discordPing + after;
      input.selectionStart = input.selectionEnd = before.length + discordPing.length;
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

    const channel = await client.channels.fetch(finalChannelId);
    if (!channel || !channel.isTextBased()) {
      return res.json({ ok: false, error: 'Channel not found or not text-based.' });
    }

    const fetched = await channel.messages.fetch({ limit: 100 });
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

    res.json({ ok: true });
  } catch (err) {
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
