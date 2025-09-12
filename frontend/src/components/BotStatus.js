import React from 'react';

const BotStatus = ({ status }) => {
  return (
    <div className="bg-discord-darker rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Bot Status</h2>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-discord-light">Connection</span>
          <div className="flex items-center">
            <div 
              className={`w-3 h-3 rounded-full mr-2 ${
                status.connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className={status.connected ? 'text-green-400' : 'text-red-400'}>
              {status.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {status.connected && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-discord-light">Servers</span>
              <span className="text-white">
                {status.guilds ? status.guilds.length : 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-discord-light">Voice Channels</span>
              <span className="text-white">
                {status.voice_connections ? Object.keys(status.voice_connections).length : 0}
              </span>
            </div>
          </>
        )}
      </div>
      
      {!status.connected && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded text-red-400 text-sm">
          Discord bot is not connected. Please check your bot configuration and ensure it's running.
        </div>
      )}
    </div>
  );
};

export default BotStatus;