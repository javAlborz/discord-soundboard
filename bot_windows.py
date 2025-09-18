#!/usr/bin/env python3
"""
Discord Soundboard Bot - Windows Host Version
Run this on Windows host to avoid WSL2 voice connection limitations.

Instructions:
1. Install Python on Windows (outside WSL2)
2. Install dependencies: pip install discord.py==2.6.3 aiohttp python-dotenv pynacl
3. Copy this file to Windows
4. Create .env file with DISCORD_TOKEN and BACKEND_URL=http://localhost:3001
5. Run: python bot_windows.py
"""

import discord
from discord.ext import commands
import os
import asyncio
import aiohttp
import ctypes.util
import sys
import platform

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("python-dotenv not installed. Set environment variables manually.")

print(f"🪟 Discord Soundboard Bot - Windows Version")
print(f"   Platform: {platform.system()} {platform.release()}")
print(f"   Python: {sys.version}")

# Ensure opus is loaded for voice functionality
if not discord.opus.is_loaded():
    opus_lib = ctypes.util.find_library('opus')
    if opus_lib:
        discord.opus.load_opus(opus_lib)
        print(f"✅ Opus loaded: {discord.opus.is_loaded()}")
    else:
        print("⚠️  Warning: Opus library not found! Voice functionality may not work.")
        print("   Install: https://opus-codec.org/downloads/")

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)

class SoundboardBot:
    def __init__(self):
        self.voice_clients = {}
        # Default to WSL2 backend, but allow override
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        print(f"🔗 Backend URL: {self.backend_url}")
    
    async def connect_to_voice(self, guild_id, channel_id):
        """Connect to a voice channel"""
        guild = bot.get_guild(guild_id)
        if not guild:
            print(f"❌ Guild {guild_id} not found")
            return False

        channel = guild.get_channel(channel_id)
        if not channel or not isinstance(channel, discord.VoiceChannel):
            print(f"❌ Voice channel {channel_id} not found or invalid")
            return False

        try:
            print(f"🎯 Attempting to connect to {channel.name} in {guild.name}")
            
            # Disconnect from any existing connection first
            if guild_id in self.voice_clients:
                print("   Disconnecting from existing voice connection")
                await self.voice_clients[guild_id].disconnect()
                del self.voice_clients[guild_id]
            
            voice_client = await channel.connect()
            self.voice_clients[guild_id] = voice_client
            print(f"✅ Successfully connected to {channel.name}. Members: {len(channel.members)}")

            # Notify backend of voice connection update
            await self.update_voice_status()
            return True
            
        except Exception as e:
            print(f"❌ Failed to connect to voice channel: {e}")
            return False
    
    async def disconnect_from_voice(self, guild_id):
        """Disconnect from voice channel"""
        if guild_id in self.voice_clients:
            voice_client = self.voice_clients[guild_id]
            await voice_client.disconnect()
            del self.voice_clients[guild_id]
            print(f"🚪 Disconnected from voice channel")
            
            # Notify backend of voice connection update
            await self.update_voice_status()
    
    async def play_sound(self, guild_id, sound_path):
        """Play a sound file in the voice channel"""
        if guild_id not in self.voice_clients:
            return False
            
        voice_client = self.voice_clients[guild_id]
        
        if not voice_client.is_connected():
            print(f"❌ Voice client not connected")
            return False
        
        if voice_client.is_playing():
            voice_client.stop()
        
        try:
            source = discord.FFmpegPCMAudio(sound_path)
            voice_client.play(source)
            print(f"🔊 Playing: {sound_path}")
            return True
        except Exception as e:
            print(f"❌ Failed to play sound: {e}")
            return False
    
    async def update_voice_status(self):
        """Update backend with current voice connection status"""
        try:
            voice_connections = {}
            
            for guild_id, voice_client in self.voice_clients.items():
                if voice_client.channel:
                    voice_connections[str(guild_id)] = {
                        'channel_id': str(voice_client.channel.id),
                        'channel_name': voice_client.channel.name
                    }
            
            async with aiohttp.ClientSession() as session:
                data = {'voice_connections': voice_connections}
                async with session.post(f'{self.backend_url}/api/bot/voice-status', json=data) as resp:
                    if resp.status == 200:
                        print(f"📡 Backend notified: {len(voice_connections)} voice connections")
                    else:
                        print(f"⚠️  Backend notification failed: {resp.status}")
                    
        except Exception as e:
            print(f"❌ Failed to update voice status: {e}")
            print(f"   Make sure backend is running at {self.backend_url}")

soundboard = SoundboardBot()

@bot.event
async def on_ready():
    print(f'✅ {bot.user} connected to Discord!')
    
    # Collect guild information
    guilds_info = []
    voice_connections = {}
    
    for guild in bot.guilds:
        guilds_info.append({
            'id': str(guild.id),
            'name': guild.name,
            'member_count': guild.member_count
        })
        print(f"   📋 Guild: {guild.name} ({guild.member_count} members)")
        
        # Check if bot is connected to voice in this guild
        if guild.voice_client:
            voice_connections[str(guild.id)] = {
                'channel_id': str(guild.voice_client.channel.id),
                'channel_name': guild.voice_client.channel.name
            }
    
    # Notify backend that bot is ready
    try:
        async with aiohttp.ClientSession() as session:
            bot_data = {
                'connected': True,
                'guilds': guilds_info,
                'voice_connections': voice_connections
            }
            async with session.post(f'{soundboard.backend_url}/api/bot/ready', json=bot_data) as resp:
                if resp.status == 200:
                    print(f"📡 Backend notified: {len(guilds_info)} guilds, {len(voice_connections)} voice connections")
                else:
                    print(f"⚠️  Backend notification failed: {resp.status}")
    except Exception as e:
        print(f"❌ Failed to notify backend: {e}")
        print(f"   Make sure backend is running at {soundboard.backend_url}")

@bot.command(name='join')
async def join_voice(ctx):
    """Join the user's voice channel"""
    print(f"🎯 !join command from {ctx.author} in {ctx.guild.name}")
    
    if not ctx.author.voice:
        await ctx.send("❌ You need to be in a voice channel!")
        return

    channel = ctx.author.voice.channel
    success = await soundboard.connect_to_voice(ctx.guild.id, channel.id)

    if success:
        await ctx.send(f"✅ Joined {channel.name}")
    else:
        await ctx.send("❌ Failed to join voice channel")

@bot.command(name='leave')
async def leave_voice(ctx):
    """Leave the voice channel"""
    await soundboard.disconnect_from_voice(ctx.guild.id)
    await ctx.send("✅ Left voice channel")

@bot.command(name='play')
async def play_sound_command(ctx, *, sound_name):
    """Play a sound by name"""
    print(f"🎵 !play command: {sound_name}")
    
    if ctx.guild.id not in soundboard.voice_clients:
        await ctx.send("❌ Bot is not in a voice channel! Use `!join` first.")
        return
    
    voice_client = soundboard.voice_clients[ctx.guild.id]
    if not voice_client.is_connected():
        await ctx.send("❌ Bot lost voice connection! Please use `!join` again.")
        del soundboard.voice_clients[ctx.guild.id]
        return
    
    # Try multiple sound file extensions
    sound_extensions = ['.mp3', '.wav', '.ogg']
    sound_path = None
    
    for ext in sound_extensions:
        test_path = f"sounds/{sound_name}{ext}"
        if os.path.exists(test_path):
            sound_path = test_path
            break
    
    if not sound_path:
        await ctx.send(f"❌ Sound '{sound_name}' not found! (tried: {', '.join(sound_extensions)})")
        return
    
    success = await soundboard.play_sound(ctx.guild.id, sound_path)
    if success:
        await ctx.send(f"🔊 Playing {sound_name}")
    else:
        await ctx.send("❌ Failed to play sound")

@bot.event
async def on_voice_state_update(member, before, after):
    """Handle voice state updates"""
    # Only auto-disconnect if no human members remain in channel
    if member.bot:
        return
        
    # Check each voice channel the bot is in
    for guild_id, voice_client in list(soundboard.voice_clients.items()):
        if voice_client.channel:
            human_members = [m for m in voice_client.channel.members if not m.bot]
            if len(human_members) == 0:
                print(f"🚪 No humans left in {voice_client.channel.name}, leaving")
                await soundboard.disconnect_from_voice(guild_id)

@bot.command(name='status')
async def status_command(ctx):
    """Show bot status"""
    status_msg = f"🤖 **Bot Status**\n"
    status_msg += f"🔗 Connected to: {len(bot.guilds)} guilds\n"
    status_msg += f"🎵 Voice connections: {len(soundboard.voice_clients)}\n"
    
    if soundboard.voice_clients:
        for guild_id, voice_client in soundboard.voice_clients.items():
            guild = bot.get_guild(guild_id)
            status_msg += f"   • {guild.name}: {voice_client.channel.name}\n"
    
    await ctx.send(status_msg)

if __name__ == "__main__":
    token = os.getenv('DISCORD_TOKEN')
    if not token:
        print("❌ DISCORD_TOKEN not found!")
        print("   Set environment variable or create .env file with:")
        print("   DISCORD_TOKEN=your_bot_token_here")
        print("   BACKEND_URL=http://localhost:3001")
        sys.exit(1)
    else:
        print("🚀 Starting Discord Soundboard Bot (Windows Version)")
        try:
            bot.run(token)
        except Exception as e:
            print(f"❌ Failed to start bot: {e}")
            sys.exit(1)