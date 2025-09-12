# Discord Soundboard

A Discord soundboard application with a web dashboard for triggering sound effects in voice channels.

## Architecture

- **Discord Bot** (Python): Handles Discord API and voice channel audio playback
- **Backend API** (Node.js): RESTful API and WebSocket server for real-time communication
- **Frontend Dashboard** (React): Web interface for managing and playing sounds

## Prerequisites

- Python 3.8+
- Node.js 16+
- uv (Python package manager)
- FFmpeg (for audio processing)

## Setup

1. **Install dependencies:**
   ```bash
   # Install Python dependencies with uv
   uv sync
   
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

2. **Configuration:**
   - Copy `.env.example` to `.env`
   - Add your Discord bot token to `.env`
   - Configure other environment variables as needed

3. **Create Discord Bot:**
   - Go to https://discord.com/developers/applications
   - Create a new application and bot
   - Copy the bot token to your `.env` file
   - Invite the bot to your Discord server with voice permissions

## Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Discord bot:**
   ```bash
   uv run python bot/main.py
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

4. **Access the dashboard:**
   - Open http://localhost:3000 in your browser

## Usage

1. Upload audio files through the web dashboard
2. Join a voice channel in Discord
3. Use `!join` command to make the bot join your voice channel
4. Click "Play" buttons in the web dashboard to play sounds
5. Use `!play <sound_name>` in Discord chat as alternative

## API Endpoints

- `GET /api/sounds` - List all sounds
- `POST /api/sounds/upload` - Upload new sound
- `POST /api/play` - Play a sound
- `DELETE /api/sounds/:filename` - Delete a sound
- `GET /api/status` - Get bot status

## Discord Commands

- `!join` - Bot joins your voice channel
- `!leave` - Bot leaves voice channel
- `!play <sound_name>` - Play a specific sound

## File Structure

```
discord-soundboard/
├── bot/                 # Python Discord bot
├── backend/            # Node.js API server
├── frontend/           # React web dashboard
├── sounds/             # Audio files storage
└── pyproject.toml      # Python dependencies
```