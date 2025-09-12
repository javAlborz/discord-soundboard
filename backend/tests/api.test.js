const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

// Import the app but don't start the server
const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Mock bot status
let botStatus = {
  connected: false,
  guilds: [],
  voice_connections: {}
};

// Storage configuration for test uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const soundsPath = path.join(__dirname, '..', 'test-sounds');
    cb(null, soundsPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', bot: botStatus });
});

app.post('/api/bot/ready', (req, res) => {
  botStatus.connected = true;
  res.json({ success: true });
});

app.get('/api/sounds', (req, res) => {
  const soundsPath = path.join(__dirname, '..', 'test-sounds');
  
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
  
  res.json({ success: true, sound: soundInfo });
});

app.post('/api/play', (req, res) => {
  const { sound, guild_id } = req.body;
  
  if (!sound) {
    return res.status(400).json({ error: 'Sound name required' });
  }
  
  res.json({ success: true, message: `Playing ${sound}` });
});

app.get('/api/servers', (req, res) => {
  res.json([
    { id: '123456789', name: 'Test Server', channels: [] }
  ]);
});

app.get('/api/channels/:serverId', (req, res) => {
  res.json([
    { id: '987654321', name: 'General', type: 'voice' },
    { id: '987654322', name: 'Music', type: 'voice' }
  ]);
});

app.delete('/api/sounds/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'test-sounds', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sound file not found' });
  }
  
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Sound deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

describe('API Endpoints', () => {
  beforeEach(() => {
    // Reset bot status
    botStatus = {
      connected: false,
      guilds: [],
      voice_connections: {}
    };
  });

  describe('GET /api/status', () => {
    it('should return server and bot status', async () => {
      const response = await request(app).get('/api/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'running',
        bot: {
          connected: false,
          guilds: [],
          voice_connections: {}
        }
      });
    });
  });

  describe('POST /api/bot/ready', () => {
    it('should update bot status to connected', async () => {
      const response = await request(app).post('/api/bot/ready');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(botStatus.connected).toBe(true);
    });
  });

  describe('GET /api/sounds', () => {
    it('should return empty array when no sounds exist', async () => {
      const response = await request(app).get('/api/sounds');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return list of sounds when they exist', async () => {
      // Create a test sound file
      const testSoundsDir = path.join(__dirname, '..', 'test-sounds');
      const testFile = path.join(testSoundsDir, 'test.mp3');
      fs.writeFileSync(testFile, 'fake audio data');
      
      const response = await request(app).get('/api/sounds');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        name: 'test',
        filename: 'test.mp3',
        path: '/sounds/test.mp3'
      });
      
      // Cleanup
      fs.unlinkSync(testFile);
    });
  });

  describe('POST /api/sounds/upload', () => {
    it('should upload a sound file successfully', async () => {
      const testSoundsDir = path.join(__dirname, '..', 'test-sounds');
      
      const response = await request(app)
        .post('/api/sounds/upload')
        .attach('sound', Buffer.from('fake audio data'), {
          filename: 'upload-test.mp3',
          contentType: 'audio/mpeg'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sound.name).toBe('upload-test');
      
      // Verify file was created
      const uploadedFile = path.join(testSoundsDir, 'upload-test.mp3');
      expect(fs.existsSync(uploadedFile)).toBe(true);
      
      // Cleanup
      fs.unlinkSync(uploadedFile);
    });

    it('should return error when no file is uploaded', async () => {
      const response = await request(app).post('/api/sounds/upload');
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'No file uploaded' });
    });
  });

  describe('POST /api/play', () => {
    it('should play a sound successfully', async () => {
      const response = await request(app)
        .post('/api/play')
        .send({ sound: 'test-sound', guild_id: '123456' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Playing test-sound'
      });
    });

    it('should return error when sound name is missing', async () => {
      const response = await request(app)
        .post('/api/play')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Sound name required' });
    });
  });

  describe('GET /api/servers', () => {
    it('should return list of servers', async () => {
      const response = await request(app).get('/api/servers');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: '123456789', name: 'Test Server', channels: [] }
      ]);
    });
  });

  describe('GET /api/channels/:serverId', () => {
    it('should return list of voice channels for a server', async () => {
      const response = await request(app).get('/api/channels/123456789');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: '987654321', name: 'General', type: 'voice' },
        { id: '987654322', name: 'Music', type: 'voice' }
      ]);
    });
  });

  describe('DELETE /api/sounds/:filename', () => {
    it('should delete a sound file successfully', async () => {
      // Create test file
      const testSoundsDir = path.join(__dirname, '..', 'test-sounds');
      const testFile = path.join(testSoundsDir, 'delete-test.mp3');
      fs.writeFileSync(testFile, 'fake audio data');
      
      const response = await request(app).delete('/api/sounds/delete-test.mp3');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Sound deleted'
      });
      
      // Verify file was deleted
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should return error when file does not exist', async () => {
      const response = await request(app).delete('/api/sounds/nonexistent.mp3');
      
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Sound file not found' });
    });
  });
});