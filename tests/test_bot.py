import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import discord

from bot.main import SoundboardBot


class TestSoundboardBot:
    
    @pytest.fixture
    def soundboard(self):
        return SoundboardBot()
    
    @pytest.fixture
    def mock_guild(self):
        guild = MagicMock()
        guild.id = 12345
        return guild
    
    @pytest.fixture
    def mock_voice_channel(self):
        channel = MagicMock(spec=discord.VoiceChannel)
        channel.id = 67890
        channel.connect = AsyncMock()
        return channel
    
    @pytest.fixture
    def mock_voice_client(self):
        client = MagicMock()
        client.disconnect = AsyncMock()
        client.is_playing = MagicMock(return_value=False)
        client.stop = MagicMock()
        client.play = MagicMock()
        return client

    def test_soundboard_init(self, soundboard):
        """Test SoundboardBot initialization"""
        assert soundboard.voice_clients == {}
        assert soundboard.backend_url == 'http://localhost:3001'
    
    @pytest.mark.asyncio
    async def test_connect_to_voice_success(self, soundboard, mock_guild, mock_voice_channel):
        """Test successful voice channel connection"""
        mock_voice_client = MagicMock()
        mock_voice_channel.connect.return_value = mock_voice_client
        
        with patch('bot.main.bot') as mock_bot:
            mock_bot.get_guild.return_value = mock_guild
            mock_guild.get_channel.return_value = mock_voice_channel
            
            result = await soundboard.connect_to_voice(12345, 67890)
            
            assert result is True
            assert soundboard.voice_clients[12345] == mock_voice_client
            mock_voice_channel.connect.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connect_to_voice_guild_not_found(self, soundboard):
        """Test voice connection when guild is not found"""
        with patch('bot.main.bot') as mock_bot:
            mock_bot.get_guild.return_value = None
            
            result = await soundboard.connect_to_voice(12345, 67890)
            
            assert result is False
            assert 12345 not in soundboard.voice_clients
    
    @pytest.mark.asyncio
    async def test_connect_to_voice_channel_not_found(self, soundboard, mock_guild):
        """Test voice connection when channel is not found"""
        with patch('bot.main.bot') as mock_bot:
            mock_bot.get_guild.return_value = mock_guild
            mock_guild.get_channel.return_value = None
            
            result = await soundboard.connect_to_voice(12345, 67890)
            
            assert result is False
            assert 12345 not in soundboard.voice_clients
    
    @pytest.mark.asyncio
    async def test_disconnect_from_voice(self, soundboard, mock_voice_client):
        """Test disconnecting from voice channel"""
        soundboard.voice_clients[12345] = mock_voice_client
        
        await soundboard.disconnect_from_voice(12345)
        
        mock_voice_client.disconnect.assert_called_once()
        assert 12345 not in soundboard.voice_clients
    
    @pytest.mark.asyncio
    async def test_disconnect_from_voice_not_connected(self, soundboard):
        """Test disconnecting when not connected to voice"""
        # Should not raise an exception
        await soundboard.disconnect_from_voice(12345)
        assert 12345 not in soundboard.voice_clients
    
    @pytest.mark.asyncio
    async def test_play_sound_success(self, soundboard, mock_voice_client):
        """Test successful sound playback"""
        soundboard.voice_clients[12345] = mock_voice_client
        
        with patch('discord.FFmpegPCMAudio') as mock_audio:
            mock_source = MagicMock()
            mock_audio.return_value = mock_source
            
            result = await soundboard.play_sound(12345, 'test.mp3')
            
            assert result is True
            mock_audio.assert_called_once_with('test.mp3')
            mock_voice_client.play.assert_called_once_with(mock_source)
    
    @pytest.mark.asyncio
    async def test_play_sound_stops_current_sound(self, soundboard, mock_voice_client):
        """Test that current sound is stopped before playing new one"""
        soundboard.voice_clients[12345] = mock_voice_client
        mock_voice_client.is_playing.return_value = True
        
        with patch('discord.FFmpegPCMAudio') as mock_audio:
            await soundboard.play_sound(12345, 'test.mp3')
            
            mock_voice_client.stop.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_play_sound_not_connected(self, soundboard):
        """Test playing sound when not connected to voice"""
        result = await soundboard.play_sound(12345, 'test.mp3')
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_play_sound_audio_error(self, soundboard, mock_voice_client):
        """Test sound playback with audio error"""
        soundboard.voice_clients[12345] = mock_voice_client
        
        with patch('discord.FFmpegPCMAudio', side_effect=Exception("Audio error")):
            result = await soundboard.play_sound(12345, 'test.mp3')
            
            assert result is False