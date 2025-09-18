const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const SOUNDS_DIR = process.env.SOUNDS_DIR || '../sounds';

// HotkeyService Class
class HotkeyService {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.hotkeyFile = path.join(this.dataDir, 'hotkeys.json');
    this.ensureDataDirectory();
    this.loadHotkeys();
  }

  generateId() {
    return crypto.randomUUID();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  loadHotkeys() {
    try {
      if (fs.existsSync(this.hotkeyFile)) {
        const data = fs.readFileSync(this.hotkeyFile, 'utf8');
        this.hotkeys = JSON.parse(data);
      } else {
        this.hotkeys = { hotkeys: [] };
        this.saveHotkeys();
      }
    } catch (error) {
      console.error('Error loading hotkeys:', error);
      this.hotkeys = { hotkeys: [] };
    }
  }

  saveHotkeys() {
    try {
      fs.writeFileSync(this.hotkeyFile, JSON.stringify(this.hotkeys, null, 2));
    } catch (error) {
      console.error('Error saving hotkeys:', error);
      throw error;
    }
  }

  getAllHotkeys() {
    return this.hotkeys.hotkeys;
  }

  getHotkeyById(id) {
    return this.hotkeys.hotkeys.find(h => h.id === id);
  }

  createHotkey(hotkeyData) {
    const validation = this.validateHotkey(hotkeyData);
    if (!validation.valid) {
      throw new Error(`Hotkey conflict with: ${validation.conflicts.map(c => c.name).join(', ')}`);
    }

    const hotkey = {
      id: this.generateId(),
      name: hotkeyData.name || 'Unnamed Hotkey',
      soundFile: hotkeyData.soundFile,
      keyCode: hotkeyData.keyCode,
      modifiers: {
        ctrl: hotkeyData.modifiers?.ctrl || false,
        alt: hotkeyData.modifiers?.alt || false,
        shift: hotkeyData.modifiers?.shift || false
      },
      enabled: hotkeyData.enabled !== undefined ? hotkeyData.enabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.hotkeys.hotkeys.push(hotkey);
    this.saveHotkeys();
    return hotkey;
  }

  updateHotkey(id, updateData) {
    const index = this.hotkeys.hotkeys.findIndex(h => h.id === id);
    if (index === -1) {
      throw new Error('Hotkey not found');
    }

    const updatedHotkey = {
      ...this.hotkeys.hotkeys[index],
      ...updateData,
      id,
      updatedAt: new Date().toISOString()
    };

    const validation = this.validateHotkey(updatedHotkey);
    if (!validation.valid) {
      throw new Error(`Hotkey conflict with: ${validation.conflicts.map(c => c.name).join(', ')}`);
    }

    this.hotkeys.hotkeys[index] = updatedHotkey;
    this.saveHotkeys();
    return updatedHotkey;
  }

  deleteHotkey(id) {
    const index = this.hotkeys.hotkeys.findIndex(h => h.id === id);
    if (index === -1) {
      throw new Error('Hotkey not found');
    }

    const deleted = this.hotkeys.hotkeys.splice(index, 1)[0];
    this.saveHotkeys();
    return deleted;
  }

  validateHotkey(hotkey) {
    const conflicts = this.hotkeys.hotkeys.filter(h =>
      h.keyCode === hotkey.keyCode &&
      JSON.stringify(h.modifiers) === JSON.stringify(hotkey.modifiers) &&
      h.id !== hotkey.id &&
      h.enabled && hotkey.enabled
    );

    return {
      valid: conflicts.length === 0,
      conflicts: conflicts
    };
  }

  getConflicts() {
    const conflicts = [];
    const enabled = this.hotkeys.hotkeys.filter(h => h.enabled);

    for (let i = 0; i < enabled.length; i++) {
      for (let j = i + 1; j < enabled.length; j++) {
        const h1 = enabled[i];
        const h2 = enabled[j];

        if (h1.keyCode === h2.keyCode &&
            JSON.stringify(h1.modifiers) === JSON.stringify(h2.modifiers)) {
          conflicts.push([h1, h2]);
        }
      }
    }

    return conflicts;
  }

  findBySoundFile(soundFile) {
    return this.hotkeys.hotkeys.filter(h => h.soundFile === soundFile);
  }
}

// Initialize hotkey service
const hotkeyService = new HotkeyService();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/sounds', express.static(path.join(__dirname, SOUNDS_DIR)));

// Storage configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const soundsPath = path.join(__dirname, SOUNDS_DIR);
    if (!fs.existsSync(soundsPath)) {
      fs.mkdirSync(soundsPath, { recursive: true });
    }
    cb(null, soundsPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename but ensure it's safe
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Bot status
let botStatus = {
  connected: false,
  guilds: [],
  voice_connections: {}
};

// Existing API Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', bot: botStatus });
});

app.post('/api/bot/ready', (req, res) => {
  const botData = req.body;

  // Update bot status with received data
  botStatus.connected = true;
  if (botData.guilds) {
    botStatus.guilds = botData.guilds;
  }
  if (botData.voice_connections) {
    botStatus.voice_connections = botData.voice_connections;
  }

  console.log(`Discord bot connected - ${botStatus.guilds?.length || 0} guilds, ${Object.keys(botStatus.voice_connections || {}).length} voice connections`);

  // Emit updated status to all connected clients
  io.emit('bot_status', botStatus);
  res.json({ success: true });
});

app.post('/api/bot/voice-status', (req, res) => {
  const { voice_connections } = req.body;

  if (voice_connections) {
    botStatus.voice_connections = voice_connections;
    console.log(`Voice connections updated: ${Object.keys(voice_connections).length} active`);

    // Emit updated status to all connected clients
    io.emit('bot_status', botStatus);
  }

  res.json({ success: true });
});

app.get('/api/sounds', (req, res) => {
  const soundsPath = path.join(__dirname, SOUNDS_DIR);

  if (!fs.existsSync(soundsPath)) {
    return res.json([]);
  }

  try {
    const files = fs.readdirSync(soundsPath)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.ogg', '.m4a'].includes(ext);
      })
      .map(file => ({
        name: path.parse(file).name,
        filename: file,
        path: `/sounds/${file}`,
        size: fs.statSync(path.join(soundsPath, file)).size
      }));

    res.json(files);
  } catch (error) {
    console.error('Error reading sounds directory:', error);
    res.status(500).json({ error: 'Failed to read sounds directory' });
  }
});

app.post('/api/sounds/upload', upload.single('sound'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const soundInfo = {
    name: path.parse(req.file.filename).name,
    filename: req.file.filename,
    path: `/sounds/${req.file.filename}`,
    size: req.file.size
  };

  // Notify all connected clients about new sound
  io.emit('sound_added', soundInfo);

  res.json({ success: true, sound: soundInfo });
});

app.post('/api/play', (req, res) => {
  const { sound, guild_id, triggered_by } = req.body;

  if (!sound) {
    return res.status(400).json({ error: 'Sound name required' });
  }

  // Log if triggered by hotkey
  if (triggered_by === 'hotkey') {
    console.log(`Hotkey triggered sound: ${sound}`);
  }

  // In a real implementation, this would communicate with the Discord bot
  // For now, we'll just emit a socket event
  io.emit('play_sound', { sound, guild_id, triggered_by });

  res.json({ success: true, message: `Playing ${sound}` });
});

app.get('/api/servers', (req, res) => {
  // This would normally fetch from Discord API
  // For prototype, return mock data
  res.json([
    { id: '123456789', name: 'Test Server', channels: [] }
  ]);
});

app.get('/api/channels/:serverId', (req, res) => {
  const { serverId } = req.params;

  // Mock voice channels data
  res.json([
    { id: '987654321', name: 'General', type: 'voice' },
    { id: '987654322', name: 'Music', type: 'voice' }
  ]);
});

app.delete('/api/sounds/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, SOUNDS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sound file not found' });
  }

  try {
    fs.unlinkSync(filePath);
    io.emit('sound_deleted', filename);
    res.json({ success: true, message: 'Sound deleted' });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

// NEW HOTKEY API ENDPOINTS

// Get all hotkey mappings
app.get('/api/hotkeys', (req, res) => {
  try {
    const hotkeys = hotkeyService.getAllHotkeys();
    res.json(hotkeys);
  } catch (error) {
    console.error('Error fetching hotkeys:', error);
    res.status(500).json({ error: 'Failed to fetch hotkeys' });
  }
});

// Create new hotkey mapping
app.post('/api/hotkeys', (req, res) => {
  try {
    const hotkey = hotkeyService.createHotkey(req.body);

    // Notify all clients about new hotkey
    io.emit('hotkey_added', hotkey);

    res.status(201).json(hotkey);
  } catch (error) {
    console.error('Error creating hotkey:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update hotkey mapping
app.put('/api/hotkeys/:id', (req, res) => {
  try {
    const { id } = req.params;
    const hotkey = hotkeyService.updateHotkey(id, req.body);

    // Notify all clients about updated hotkey
    io.emit('hotkey_updated', hotkey);

    res.json(hotkey);
  } catch (error) {
    console.error('Error updating hotkey:', error);
    if (error.message === 'Hotkey not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Delete hotkey mapping
app.delete('/api/hotkeys/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = hotkeyService.deleteHotkey(id);

    // Notify all clients about deleted hotkey
    io.emit('hotkey_deleted', id);

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting hotkey:', error);
    if (error.message === 'Hotkey not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete hotkey' });
    }
  }
});

// Validate hotkey combination
app.post('/api/hotkeys/validate', (req, res) => {
  try {
    const validation = hotkeyService.validateHotkey(req.body);
    res.json(validation);
  } catch (error) {
    console.error('Error validating hotkey:', error);
    res.status(500).json({ error: 'Failed to validate hotkey' });
  }
});

// Get hotkey conflicts
app.get('/api/hotkeys/conflicts', (req, res) => {
  try {
    const conflicts = hotkeyService.getConflicts();
    res.json(conflicts);
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current bot status to new client
  socket.emit('bot_status', botStatus);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('join_voice', (data) => {
    // Forward to bot (in real implementation)
    console.log('Join voice request:', data);
    io.emit('bot_command', { command: 'join', ...data });
  });

  socket.on('leave_voice', (data) => {
    console.log('Leave voice request:', data);
    io.emit('bot_command', { command: 'leave', ...data });
  });

  socket.on('play_sound', (data) => {
    console.log('Play sound request:', data);
    io.emit('bot_command', { command: 'play', ...data });
  });
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }
  }

  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Sounds directory: ${path.resolve(__dirname, SOUNDS_DIR)}`);
});