# Discord Soundboard - Windows Host Setup

## 🎯 Purpose
Run the Discord bot on Windows host to avoid WSL2 voice connection limitations (Error 4006).

## 📋 Prerequisites
- Windows 10/11
- Python 3.8+ installed on Windows (NOT in WSL2)
- Discord bot token

## 🔧 Setup Instructions

### 1. Install Python on Windows
1. Download Python from https://python.org/downloads/
2. **Important**: Check "Add Python to PATH" during installation
3. Open Command Prompt and verify: `python --version`

### 2. Install Required Dependencies
```cmd
pip install discord.py==2.6.3 aiohttp python-dotenv pynacl
```

### 3. Copy Bot Files to Windows
Copy these files from WSL2 to Windows:
- `bot_windows.py` → Windows directory (e.g., `C:\DiscordBot\`)
- `sounds/` folder → Windows directory
- `.env` file → Windows directory

### 4. Create Windows .env File
Create `.env` file in your Windows bot directory:
```env
DISCORD_TOKEN=your_bot_token_here
BACKEND_URL=http://localhost:3001
```

### 5. Install FFmpeg (Required for Audio)
1. Download FFmpeg from https://ffmpeg.org/download.html#build-windows
2. Extract to `C:\ffmpeg\`
3. Add `C:\ffmpeg\bin` to Windows PATH environment variable

### 6. Install Opus Codec (Optional but Recommended)
Download opus.dll from: https://opus-codec.org/downloads/
Place in your Python installation directory or bot folder.

## 🚀 Running the Bot

### Option 1: Command Prompt
```cmd
cd C:\DiscordBot
python bot_windows.py
```

### Option 2: PowerShell
```powershell
cd C:\DiscordBot
python bot_windows.py
```

### Option 3: Create Batch File
Create `start_bot.bat`:
```batch
@echo off
cd /d C:\DiscordBot
python bot_windows.py
pause
```

## 🔍 Expected Output
```
🪟 Discord Soundboard Bot - Windows Version
   Platform: Windows 10
   Python: 3.11.0
✅ Opus loaded: True
🔗 Backend URL: http://localhost:3001
🚀 Starting Discord Soundboard Bot (Windows Version)
✅ soundboard#0830 connected to Discord!
   📋 Guild: pythongawa (6 members)
📡 Backend notified: 1 guilds, 0 voice connections
```

## 🧪 Testing Voice Connection
1. Join a Discord voice channel
2. In Discord chat: `!join`
3. Should see: "✅ Joined [channel name]" (NO Error 4006!)
4. Test playback: `!play ceeday-huh-sound-effect`
5. Should hear audio in Discord voice channel

## 🔧 Architecture
```
[WSL2] Frontend + Backend ←→ HTTP ←→ [Windows] Discord Bot
   ↕                                     ↕
Dashboard/API                         Discord Voice
```

## 🎯 Commands
- `!join` - Join your voice channel
- `!leave` - Leave voice channel
- `!play <sound_name>` - Play sound (without .mp3 extension)
- `!status` - Show bot connection status

## 🐛 Troubleshooting

### "FFmpeg not found"
- Install FFmpeg and add to PATH
- Or place `ffmpeg.exe` in bot directory

### "Opus library not found"
- Install opus.dll or ignore (bot will work without it)

### "Backend notification failed"
- Ensure WSL2 backend is running: `http://localhost:3001`
- Check Windows firewall settings

### "Connection timeout"
- Check Discord bot token is valid
- Verify bot has necessary permissions in Discord server

## 🎉 Success!
Once working on Windows, you'll have:
- ✅ Real Discord voice connections (no Error 4006)
- ✅ Actual audio playback in Discord
- ✅ Full integration with WSL2 web dashboard
- ✅ Stable voice connections that persist