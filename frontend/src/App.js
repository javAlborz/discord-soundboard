import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import SoundBoard from './components/SoundBoard';
import UploadSection from './components/UploadSection';
import BotStatus from './components/BotStatus';
import HotkeyManager from './components/HotkeyManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [sounds, setSounds] = useState([]);
  const [botStatus, setBotStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sounds');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('bot_status', (status) => {
      setBotStatus(status);
    });

    newSocket.on('sound_added', (sound) => {
      setSounds(prev => [...prev, sound]);
    });

    newSocket.on('sound_deleted', (filename) => {
      setSounds(prev => prev.filter(sound => sound.filename !== filename));
    });

    newSocket.on('play_sound', (data) => {
      console.log('Sound played:', data);
    });

    // Hotkey events
    newSocket.on('hotkey_added', (hotkey) => {
      console.log('Hotkey added:', hotkey);
    });

    newSocket.on('hotkey_updated', (hotkey) => {
      console.log('Hotkey updated:', hotkey);
    });

    newSocket.on('hotkey_deleted', (hotkeyId) => {
      console.log('Hotkey deleted:', hotkeyId);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    // Fetch initial sounds
    fetchSounds();
  }, []);

  const fetchSounds = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sounds`);
      const soundsData = await response.json();
      setSounds(soundsData);
    } catch (error) {
      console.error('Failed to fetch sounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const playSound = async (soundName) => {
    try {
      const response = await fetch(`${API_URL}/api/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sound: soundName,
          triggered_by: 'web_dashboard'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to play sound');
      }

      console.log(`Playing sound: ${soundName}`);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const deleteSound = async (filename) => {
    try {
      const response = await fetch(`${API_URL}/api/sounds/${filename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete sound');
      }

      console.log(`Deleted sound: ${filename}`);
    } catch (error) {
      console.error('Error deleting sound:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-discord-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-discord-blurple mb-2">
            Discord Soundboard
          </h1>
          <p className="text-discord-light">
            Control your Discord bot's sound effects from the web
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-discord-darker rounded-lg p-1">
            <button
              onClick={() => setActiveTab('sounds')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'sounds'
                  ? 'bg-discord-blurple text-white'
                  : 'text-discord-light hover:text-white'
              }`}
            >
              🎵 Sounds
            </button>
            <button
              onClick={() => setActiveTab('hotkeys')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'hotkeys'
                  ? 'bg-discord-blurple text-white'
                  : 'text-discord-light hover:text-white'
              }`}
            >
              ⌨️ Hotkeys
            </button>
          </div>
        </div>

        {activeTab === 'sounds' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <BotStatus status={botStatus} />
              <div className="mt-6">
                <UploadSection onUploadComplete={fetchSounds} />
              </div>

              {/* Hotkey Status Card */}
              <div className="mt-6 bg-discord-darker rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Hotkey Status</h3>
                <div className="text-sm text-discord-light">
                  <div className="flex justify-between mb-1">
                    <span>Sounds with hotkeys:</span>
                    <span className="text-discord-blurple">
                      {sounds.filter(sound =>
                        sound.hotkeys && sound.hotkeys.length > 0
                      ).length} / {sounds.length}
                    </span>
                  </div>
                  <div className="text-xs text-discord-light mt-2">
                    Switch to Hotkeys tab to manage shortcuts
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('hotkeys')}
                  className="w-full mt-3 bg-discord-blurple hover:bg-discord-blurple/80 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  Manage Hotkeys
                </button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <SoundBoard
                sounds={sounds}
                onPlaySound={playSound}
                onDeleteSound={deleteSound}
              />
            </div>
          </div>
        )}

        {activeTab === 'hotkeys' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <BotStatus status={botStatus} />

              {/* Back to Sounds Card */}
              <div className="mt-6 bg-discord-darker rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Sound Management</h3>
                <div className="text-sm text-discord-light mb-3">
                  Upload and manage your sound files
                </div>
                <button
                  onClick={() => setActiveTab('sounds')}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  ← Back to Sounds
                </button>
              </div>

              {/* Hotkey Help */}
              <div className="mt-6 bg-discord-darker rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">⚡ Overwolf Integration</h3>
                <div className="text-sm text-discord-light space-y-2">
                  <p>Install the Overwolf app for global hotkeys:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Download Discord Soundboard Hotkeys from Overwolf</li>
                    <li>Install and launch the app</li>
                    <li>Hotkeys created here will work globally</li>
                  </ol>
                  <div className="text-xs text-yellow-400 mt-2">
                    ⚠️ Web hotkeys only work when this page is focused
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <HotkeyManager sounds={sounds} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;