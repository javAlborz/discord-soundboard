import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import SoundBoard from './components/SoundBoard';
import UploadSection from './components/UploadSection';
import BotStatus from './components/BotStatus';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [sounds, setSounds] = useState([]);
  const [botStatus, setBotStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);

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
        body: JSON.stringify({ sound: soundName }),
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <BotStatus status={botStatus} />
            <div className="mt-6">
              <UploadSection onUploadComplete={fetchSounds} />
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
      </div>
    </div>
  );
}

export default App;