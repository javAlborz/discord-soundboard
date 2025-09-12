import pytest
import asyncio
import aiohttp
import json
import os
import time
import subprocess
import signal
from pathlib import Path

class TestAPIIntegration:
    """Integration tests for the backend API"""
    
    @pytest.fixture(scope="class")
    async def backend_server(self):
        """Start backend server for integration testing"""
        # Set up test environment
        env = os.environ.copy()
        env.update({
            'NODE_ENV': 'test',
            'PORT': '3002',
            'SOUNDS_DIR': './test-sounds'
        })
        
        # Start the backend server
        backend_dir = Path(__file__).parent.parent.parent / 'backend'
        process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        await asyncio.sleep(3)
        
        # Check if server is running
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get('http://localhost:3002/api/status') as response:
                    if response.status != 200:
                        raise Exception("Server failed to start")
        except Exception as e:
            process.terminate()
            raise e
        
        yield process
        
        # Cleanup
        process.terminate()
        process.wait()
    
    @pytest.fixture
    def api_url(self):
        return 'http://localhost:3002'
    
    @pytest.mark.asyncio
    async def test_server_status(self, backend_server, api_url):
        """Test server status endpoint"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{api_url}/api/status') as response:
                assert response.status == 200
                data = await response.json()
                assert data['status'] == 'running'
                assert 'bot' in data
    
    @pytest.mark.asyncio
    async def test_bot_ready_endpoint(self, backend_server, api_url):
        """Test bot ready notification endpoint"""
        async with aiohttp.ClientSession() as session:
            async with session.post(f'{api_url}/api/bot/ready') as response:
                assert response.status == 200
                data = await response.json()
                assert data['success'] is True
    
    @pytest.mark.asyncio
    async def test_sounds_crud_operations(self, backend_server, api_url):
        """Test complete CRUD operations for sounds"""
        async with aiohttp.ClientSession() as session:
            # 1. Get initial sounds (should be empty)
            async with session.get(f'{api_url}/api/sounds') as response:
                assert response.status == 200
                sounds = await response.json()
                initial_count = len(sounds)
            
            # 2. Upload a test sound
            test_audio_data = b'fake audio content for testing'
            form = aiohttp.FormData()
            form.add_field('sound', test_audio_data, 
                         filename='test-integration.mp3', 
                         content_type='audio/mpeg')
            
            async with session.post(f'{api_url}/api/sounds/upload', data=form) as response:
                assert response.status == 200
                upload_result = await response.json()
                assert upload_result['success'] is True
                assert 'sound' in upload_result
                uploaded_sound = upload_result['sound']
                assert uploaded_sound['name'] == 'test-integration'
            
            # 3. Verify sound appears in list
            async with session.get(f'{api_url}/api/sounds') as response:
                assert response.status == 200
                sounds = await response.json()
                assert len(sounds) == initial_count + 1
                
                # Find our uploaded sound
                test_sound = next((s for s in sounds if s['name'] == 'test-integration'), None)
                assert test_sound is not None
                assert test_sound['filename'] == 'test-integration.mp3'
            
            # 4. Play the sound
            async with session.post(f'{api_url}/api/play', 
                                  json={'sound': 'test-integration'}) as response:
                assert response.status == 200
                play_result = await response.json()
                assert play_result['success'] is True
                assert 'Playing test-integration' in play_result['message']
            
            # 5. Delete the sound
            async with session.delete(f'{api_url}/api/sounds/test-integration.mp3') as response:
                assert response.status == 200
                delete_result = await response.json()
                assert delete_result['success'] is True
            
            # 6. Verify sound is removed from list
            async with session.get(f'{api_url}/api/sounds') as response:
                assert response.status == 200
                sounds = await response.json()
                assert len(sounds) == initial_count
                
                # Ensure our sound is not in the list
                test_sound = next((s for s in sounds if s['name'] == 'test-integration'), None)
                assert test_sound is None
    
    @pytest.mark.asyncio
    async def test_upload_validation(self, backend_server, api_url):
        """Test upload validation"""
        async with aiohttp.ClientSession() as session:
            # Test uploading non-audio file
            text_data = b'This is not an audio file'
            form = aiohttp.FormData()
            form.add_field('sound', text_data, 
                         filename='test.txt', 
                         content_type='text/plain')
            
            async with session.post(f'{api_url}/api/sounds/upload', data=form) as response:
                assert response.status == 400
                error_result = await response.json()
                assert 'error' in error_result
    
    @pytest.mark.asyncio
    async def test_play_validation(self, backend_server, api_url):
        """Test play sound validation"""
        async with aiohttp.ClientSession() as session:
            # Test playing without sound name
            async with session.post(f'{api_url}/api/play', json={}) as response:
                assert response.status == 400
                error_result = await response.json()
                assert error_result['error'] == 'Sound name required'
    
    @pytest.mark.asyncio
    async def test_servers_and_channels_endpoints(self, backend_server, api_url):
        """Test servers and channels endpoints"""
        async with aiohttp.ClientSession() as session:
            # Test servers endpoint
            async with session.get(f'{api_url}/api/servers') as response:
                assert response.status == 200
                servers = await response.json()
                assert isinstance(servers, list)
                if servers:
                    assert 'id' in servers[0]
                    assert 'name' in servers[0]
            
            # Test channels endpoint
            async with session.get(f'{api_url}/api/channels/123456789') as response:
                assert response.status == 200
                channels = await response.json()
                assert isinstance(channels, list)
                if channels:
                    assert 'id' in channels[0]
                    assert 'name' in channels[0]
                    assert 'type' in channels[0]
    
    @pytest.mark.asyncio
    async def test_delete_nonexistent_sound(self, backend_server, api_url):
        """Test deleting non-existent sound"""
        async with aiohttp.ClientSession() as session:
            async with session.delete(f'{api_url}/api/sounds/nonexistent.mp3') as response:
                assert response.status == 404
                error_result = await response.json()
                assert error_result['error'] == 'Sound file not found'