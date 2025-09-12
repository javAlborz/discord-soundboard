import discord
from discord.ext import commands
import os
import asyncio
import aiohttp
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True
intents.voice_states = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)

class SoundboardBot:
    def __init__(self):
        self.voice_clients = {}
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
    
    async def connect_to_voice(self, guild_id, channel_id):
        """Connect to a voice channel"""
        guild = bot.get_guild(guild_id)
        if not guild:
            return False
            
        channel = guild.get_channel(channel_id)
        if not channel or not isinstance(channel, discord.VoiceChannel):
            return False
            
        try:
            voice_client = await channel.connect()
            self.voice_clients[guild_id] = voice_client
            
            # Notify backend of voice connection update
            await self.update_voice_status()
            return True
        except Exception as e:
            print(f"Failed to connect to voice channel: {e}")
            return False
    
    async def disconnect_from_voice(self, guild_id):
        """Disconnect from voice channel"""
        if guild_id in self.voice_clients:
            await self.voice_clients[guild_id].disconnect()
            del self.voice_clients[guild_id]
            
            # Notify backend of voice connection update
            await self.update_voice_status()
    
    async def play_sound(self, guild_id, sound_path):
        """Play a sound file in the voice channel"""
        if guild_id not in self.voice_clients:
            return False
            
        voice_client = self.voice_clients[guild_id]
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
                if voice_client.channel:
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
    if not ctx.author.voice:
        await ctx.send("You need to be in a voice channel!")
        return
    
    channel = ctx.author.voice.channel
    success = await soundboard.connect_to_voice(ctx.guild.id, channel.id)
    
    if success:
        await ctx.send(f"Joined {channel.name}")
    else:
        await ctx.send("Failed to join voice channel")

@bot.command(name='leave')
async def leave_voice(ctx):
    """Leave the voice channel"""
    await soundboard.disconnect_from_voice(ctx.guild.id)
    await ctx.send("Left voice channel")

@bot.command(name='play')
async def play_sound_command(ctx, *, sound_name):
    """Play a sound by name"""
    if ctx.guild.id not in soundboard.voice_clients:
        await ctx.send("Bot is not in a voice channel! Use `!join` first.")
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
    # If bot is alone in channel, leave
    if member == bot.user:
        return
    
    for guild_id, voice_client in soundboard.voice_clients.items():
        if voice_client.channel and len(voice_client.channel.members) == 1:
            await soundboard.disconnect_from_voice(guild_id)

if __name__ == "__main__":
    token = os.getenv('DISCORD_TOKEN')
    if not token:
        print("DISCORD_TOKEN not found in environment variables!")
    else:
        bot.run(token)