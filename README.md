# Discord Soundboard

A complete Discord soundboard application with web dashboard, global hotkeys, and real-time voice channel integration. Perfect for gaming communities, streamers, and Discord servers.

## ✨ Features

### 🎵 **Audio Management**
- Web-based sound library with drag & drop upload
- Real-time sound playback in Discord voice channels
- Local preview before playing in Discord
- Search and filter your sound collection

### 🎮 **Gaming Integration**
- **Overwolf hotkey system** for instant sound triggering during gameplay
- Global hotkeys work across all applications
- No need to alt-tab - play sounds while gaming

### 📊 **Real-time Dashboard**
- Live bot connection status
- Voice channel monitoring
- Server and channel statistics
- Responsive design for all devices

### 🤖 **Discord Bot**
- Voice channel management (`!join`, `!leave`)
- Chat commands (`!play <sound_name>`)
- Multi-server support
- Reliable voice connections with discord.py 2.6.3

## 🏗️ Architecture

```
[React Dashboard] ←→ Socket.io ←→ [Node.js API] ←→ HTTP ←→ [Python Bot] ←→ Discord
       ↑                             ↑                        ↑
   Web Interface              Real-time Updates         Voice Channels
       ↑                             ↑
[Overwolf Hotkeys] ←→ Global Detection ←→ API Calls
```

## 🚀 Quick Start

**One-command setup:**
```bash
./start.sh  # Starts backend + frontend
```

**In a separate terminal:**
```bash
uv run python bot/main.py  # Start Discord bot
```

**Access your soundboard:**
- Dashboard: http://localhost:3000
- API: http://localhost:3051

## 📋 Prerequisites

- **Python 3.8+** with uv package manager
- **Node.js 16+**
- **FFmpeg** (for audio processing)
- **Discord Bot Token** (see setup below)

## ⚙️ Installation

### 1. Install Dependencies
```bash
# Python dependencies
uv sync

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd frontend && npm install
```

### 2. Discord Bot Setup
1. Go to https://discord.com/developers/applications
2. Create new application → Bot
3. Copy bot token
4. Invite bot to server with:
   - Send Messages
   - Connect & Speak in Voice Channels
   - Use Voice Activity

### 3. Environment Configuration
```bash
# Copy template and edit
cp .env.example .env

# Required variables:
DISCORD_TOKEN=your_bot_token_here
PORT=3051
BACKEND_URL=http://localhost:3051
FRONTEND_URL=http://localhost:3000
```

## 🎯 Usage

### Basic Workflow
1. **Upload sounds** via web dashboard (drag & drop)
2. **Join voice channel** in Discord
3. **Bot joins** with `!join` command
4. **Play sounds** via dashboard or `!play <name>`

### Hotkey System (Overwolf)
1. Install Overwolf app from store
2. Configure hotkeys in dashboard
3. Play sounds instantly while gaming
4. No interruption to gameplay

## 🧪 Testing

**Complete test suite:**
```bash
./run_tests.sh  # All tests with coverage report
```

**Individual test suites:**
```bash
# Python bot tests
uv run pytest tests/test_bot.py -v

# Backend API tests
cd backend && npm test

# Frontend component tests
cd frontend && npm test
```

## 📡 API Reference

### Sound Management
- `GET /api/sounds` - List all available sounds
- `POST /api/sounds/upload` - Upload new sound files
- `DELETE /api/sounds/:filename` - Remove sound from library
- `POST /api/play` - Trigger sound playback in voice channel

### Bot Status
- `GET /api/status` - Current bot and voice connection status
- `POST /api/bot/ready` - Bot startup notification (internal)
- `POST /api/bot/voice-status` - Voice state updates (internal)

### Server Information
- `GET /api/servers` - List Discord servers (mock data)
- `GET /api/channels/:serverId` - List voice channels (mock data)

## 💬 Discord Commands

- `!join` - Bot joins your current voice channel
- `!leave` - Bot leaves voice channel
- `!play <sound_name>` - Play specific sound by name

## 📁 Project Structure

```
discord-soundboard/
├── 🤖 bot/                 # Python Discord bot
│   ├── main.py            # Bot entry point
│   └── bot_windows.py     # Windows-compatible version
├── ⚙️ backend/            # Node.js API server
│   ├── server.js          # Express server + Socket.io
│   └── tests/             # Backend API tests
├── 🎨 frontend/           # React web dashboard
│   ├── src/App.js         # Main React component
│   ├── src/components/    # UI components
│   └── tests/             # Frontend component tests
├── 🎵 sounds/             # Audio files storage
├── 🧪 tests/              # Python integration tests
├── 📜 start.sh            # Quick start script
├── 🔧 run_tests.sh        # Complete test suite
└── 📦 pyproject.toml      # Python dependencies
```

## 🔧 Development

### Individual Component Development
```bash
# Backend with auto-reload
cd backend && npm run dev

# Frontend with hot reload
cd frontend && npm start

# Bot with debug logging
BOT_DEBUG=true uv run python bot/main.py
```

### Code Quality
```bash
# Python formatting
uv run black bot/ tests/

# JavaScript/React linting (if configured)
cd backend && npm run lint
cd frontend && npm run lint
```

## 🚀 Production Deployment

### Windows Host (Recommended for Production)
1. Use `bot_windows.py` for better voice stability
2. Run on Windows host machine (not WSL2)
3. See `WINDOWS_SETUP.md` for detailed instructions

### Environment Variables for Production
```bash
DISCORD_TOKEN=production_bot_token
NODE_ENV=production
PORT=3051
BACKEND_URL=https://your-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## 🐛 Troubleshooting

### Voice Connection Issues
- ✅ **Fixed**: Upgraded to discord.py 2.6.3
- Ensure FFmpeg is installed and accessible
- Check Discord bot permissions (Connect, Speak)
- For WSL2: Consider using Windows host deployment

### Common Issues
- **Bot offline**: Check Discord token and internet connection
- **Upload fails**: Verify file size limits and format support
- **Hotkeys not working**: Install Overwolf and configure permissions

## 🏆 Status

**✅ Production Ready**
- All core features implemented and tested
- Voice connection issues resolved (discord.py 2.6.3)
- Comprehensive test coverage
- Real-time web dashboard functional
- Overwolf hotkey integration complete

## 📄 License

MIT License - Feel free to use for personal and commercial projects.