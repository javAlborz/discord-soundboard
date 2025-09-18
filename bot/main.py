import discord
from discord.ext import commands
import os
import asyncio
import aiohttp
import ctypes.util
from dotenv import load_dotenv

load_dotenv()

# Ensure opus is loaded for voice functionality
if not discord.opus.is_loaded():
    opus_lib = ctypes.util.find_library('opus')
    if opus_lib:
        discord.opus.load_opus(opus_lib)
        print(f"Opus loaded: {discord.opus.is_loaded()}")
    else:
        print("Warning: Opus library not found! Voice functionality may not work.")

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)

class SoundboardBot:
    def __init__(self):
        self.voice_clients = {}
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        # Enable mock mode for WSL2/environments where voice doesn't work
        self.mock_mode = os.getenv('BOT_MOCK_VOICE', 'false').lower() == 'true'
        print(f"🔧 SoundboardBot initialized:", flush=True)
        print(f"   Backend URL: {self.backend_url}", flush=True)
        print(f"   Mock Mode: {self.mock_mode}", flush=True)
        print(f"   BOT_MOCK_VOICE env var: '{os.getenv('BOT_MOCK_VOICE', 'NOT_SET')}'", flush=True)
        if self.mock_mode:
            print("🎭 Mock voice mode is ENABLED - voice connections will be simulated", flush=True)
    
    async def connect_to_voice(self, guild_id, channel_id):
        """Connect to a voice channel"""
        guild = bot.get_guild(guild_id)
        if not guild:
            print(f"Guild {guild_id} not found")
            return False

        channel = guild.get_channel(channel_id)
        if not channel or not isinstance(channel, discord.VoiceChannel):
            print(f"Voice channel {channel_id} not found or invalid")
            return False

        if self.mock_mode:
            print(f"🎭 MOCK MODE: Simulating connection to {channel.name} in {guild.name}")
            # Store mock connection info
            self.voice_clients[guild_id] = {
                'channel': channel,
                'mock': True,
                'connected': True
            }
            await self.update_voice_status()
            print(f"🎭 MOCK: Successfully 'connected' to {channel.name}")
            return True

        try:
            print(f"Attempting to connect to {channel.name} in {guild.name}")
            
            # Disconnect from any existing connection first
            if guild_id in self.voice_clients:
                print("Disconnecting from existing voice connection")
                if hasattr(self.voice_clients[guild_id], 'disconnect'):
                    await self.voice_clients[guild_id].disconnect()
                del self.voice_clients[guild_id]
            
            # Add a small delay before connecting to let any previous disconnect complete
            import asyncio
            await asyncio.sleep(1)
            
            voice_client = await channel.connect()
            self.voice_clients[guild_id] = voice_client
            print(f"Successfully connected to {channel.name}. Members in channel: {len(channel.members)}")

            # Give the connection a moment to stabilize before notifying backend
            await asyncio.sleep(2)
            
            # Verify the connection is still active
            if voice_client.is_connected():
                print(f"Voice connection to {channel.name} is stable")
                await self.update_voice_status()
                return True
            else:
                print(f"Voice connection to {channel.name} was not stable, removing from tracking")
                if guild_id in self.voice_clients:
                    del self.voice_clients[guild_id]
                return False
                
        except Exception as e:
            print(f"Failed to connect to voice channel: {e}")
            print("💡 TIP: Set BOT_MOCK_VOICE=true in .env to use mock mode for testing in WSL2")
            return False
    
    async def disconnect_from_voice(self, guild_id):
        """Disconnect from voice channel"""
        if guild_id in self.voice_clients:
            voice_client = self.voice_clients[guild_id]
            
            if isinstance(voice_client, dict):
                # Mock connection
                print(f"🎭 MOCK MODE: Disconnecting from {voice_client['channel'].name}")
            else:
                # Real voice client
                await voice_client.disconnect()
                
            del self.voice_clients[guild_id]
            
            # Notify backend of voice connection update
            await self.update_voice_status()
    
    async def play_sound(self, guild_id, sound_path):
        """Play a sound file in the voice channel"""
        if guild_id not in self.voice_clients:
            return False
            
        voice_client = self.voice_clients[guild_id]
        
        if self.mock_mode or isinstance(voice_client, dict):
            print(f"🎭 MOCK MODE: Simulating playback of {sound_path}")
            import time
            # Simulate playback time
            print(f"🔊 MOCK: Playing sound for 3 seconds...")
            return True
        
        if voice_client.is_playing():
            voice_client.stop()
        
        try:
            source = discord.FFmpegPCMAudio(sound_path)
            voice_client.play(source)
            return True
        except Exception as e:
            print(f"Failed to play sound: {e}")
            return False
    
    async def update_voice_status(self):
        """Update backend with current voice connection status"""
        try:
            voice_connections = {}
            
            for guild_id, voice_client in self.voice_clients.items():
                # Handle both real voice clients and mock connections
                if isinstance(voice_client, dict):
                    # Mock connection
                    channel = voice_client['channel']
                    voice_connections[str(guild_id)] = {
                        'channel_id': str(channel.id),
                        'channel_name': channel.name
                    }
                elif hasattr(voice_client, 'channel') and voice_client.channel:
                    # Real voice client
                    voice_connections[str(guild_id)] = {
                        'channel_id': str(voice_client.channel.id),
                        'channel_name': voice_client.channel.name
                    }
            
            async with aiohttp.ClientSession() as session:
                data = {'voice_connections': voice_connections}
                async with session.post(f'{self.backend_url}/api/bot/voice-status', json=data) as resp:
                    pass
                    
        except Exception as e:
            print(f"Failed to update voice status: {e}")

soundboard = SoundboardBot()


@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    
    # Collect guild and voice connection information
    guilds_info = []
    voice_connections = {}
    
    for guild in bot.guilds:
        guilds_info.append({
            'id': str(guild.id),
            'name': guild.name,
            'member_count': guild.member_count
        })
        
        # Check if bot is connected to voice in this guild
        if guild.voice_client:
            voice_connections[str(guild.id)] = {
                'channel_id': str(guild.voice_client.channel.id),
                'channel_name': guild.voice_client.channel.name
            }
    
    # Notify backend that bot is ready with guild info
    try:
        async with aiohttp.ClientSession() as session:
            bot_data = {
                'connected': True,
                'guilds': guilds_info,
                'voice_connections': voice_connections
            }
            async with session.post(f'{soundboard.backend_url}/api/bot/ready', json=bot_data) as resp:
                print(f"Notified backend: {len(guilds_info)} guilds, {len(voice_connections)} voice connections")
    except Exception as e:
        print(f"Failed to notify backend: {e}")

@bot.command(name='join')
async def join_voice(ctx):
    """Join the user's voice channel"""
    print(f"🎯 !join command called by {ctx.author} in {ctx.guild.name}")
    
    if not ctx.author.voice:
        print(f"❌ User {ctx.author} is not in a voice channel")
        await ctx.send("You need to be in a voice channel!")
        return

    channel = ctx.author.voice.channel
    print(f"🎯 Attempting to join {channel.name} (ID: {channel.id})")
    success = await soundboard.connect_to_voice(ctx.guild.id, channel.id)

    if success:
        print(f"✅ Successfully joined {channel.name}")
        await ctx.send(f"Joined {channel.name}")
    else:
        print(f"❌ Failed to join {channel.name}")
        await ctx.send("Failed to join voice channel")

@bot.command(name='leave')
async def leave_voice(ctx):
    """Leave the voice channel"""
    await soundboard.disconnect_from_voice(ctx.guild.id)
    await ctx.send("Left voice channel")

@bot.command(name='play')
async def play_sound_command(ctx, *, sound_name):
    """Play a sound by name"""
    print(f"Play command called for: {sound_name}")
    print(f"Voice clients: {list(soundboard.voice_clients.keys())}")
    
    if ctx.guild.id not in soundboard.voice_clients:
        await ctx.send("Bot is not in a voice channel! Use `!join` first.")
        return
    
    voice_client = soundboard.voice_clients[ctx.guild.id]
    
    # Handle mock connections vs real voice clients
    if isinstance(voice_client, dict):
        # Mock connection - always considered connected
        if not voice_client.get('connected', False):
            await ctx.send("Bot lost voice connection! Please use `!join` again.")
            del soundboard.voice_clients[ctx.guild.id]
            return
    else:
        # Real voice client
        if not voice_client.is_connected():
            await ctx.send("Bot lost voice connection! Please use `!join` again.")
            del soundboard.voice_clients[ctx.guild.id]
            return
    
    sound_path = f"sounds/{sound_name}.mp3"
    if not os.path.exists(sound_path):
        await ctx.send(f"Sound '{sound_name}' not found!")
        return
    
    success = await soundboard.play_sound(ctx.guild.id, sound_path)
    if success:
        await ctx.send(f"Playing {sound_name}")
    else:
        await ctx.send("Failed to play sound")

@bot.event
async def on_voice_state_update(member, before, after):
    """Handle voice state updates"""
    # If bot's voice state changes, log it but don't auto-disconnect immediately
    if member == bot.user:
        print(f"Bot voice state changed: {before.channel} -> {after.channel}")
        
        # If bot was disconnected (after.channel is None), clean up our tracking
        if after.channel is None and before.channel is not None:
            guild_id = before.channel.guild.id
            if guild_id in soundboard.voice_clients:
                print(f"Bot was disconnected from {before.channel.name}, cleaning up voice client tracking")
                del soundboard.voice_clients[guild_id]
                await soundboard.update_voice_status()
        return

    # Check if bot should leave due to being alone (with longer delay and better checks)
    import asyncio
    await asyncio.sleep(5)  # Wait 5 seconds to let other members join/leave
    
    for guild_id, voice_client in list(soundboard.voice_clients.items()):
        # Handle both real voice clients and mock connections
        if isinstance(voice_client, dict):
            channel = voice_client['channel']
        elif hasattr(voice_client, 'channel') and voice_client.channel:
            channel = voice_client.channel
        else:
            continue
            
        if channel:
            # Refresh channel data to get current member list
            channel = bot.get_channel(channel.id)
            if channel:
                members_in_channel = len(channel.members)
                human_members = [m for m in channel.members if not m.bot]
                print(f"Voice channel {channel.name} has {members_in_channel} total members, {len(human_members)} human members")
                
                # Only disconnect if no human members are left (only bots remain)
                if len(human_members) == 0:
                    print(f"No human members left in {channel.name}, disconnecting bot")
                    await soundboard.disconnect_from_voice(guild_id)

if __name__ == "__main__":
    token = os.getenv('DISCORD_TOKEN')
    if not token:
        print("DISCORD_TOKEN not found in environment variables!")
    else:
        bot.run(token)