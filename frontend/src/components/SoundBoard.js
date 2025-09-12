import React, { useState } from 'react';

const SoundBoard = ({ sounds, onPlaySound, onDeleteSound }) => {
  const [filter, setFilter] = useState('');

  const filteredSounds = sounds.filter(sound =>
    sound.name.toLowerCase().includes(filter.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = (sound) => {
    if (window.confirm(`Are you sure you want to delete "${sound.name}"?`)) {
      onDeleteSound(sound.filename);
    }
  };

  return (
    <div className="bg-discord-darker rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Sound Effects</h2>
        <div className="text-discord-light">
          {filteredSounds.length} of {sounds.length} sounds
        </div>
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search sounds..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-discord-dark text-white px-4 py-2 rounded-lg border border-discord-light/20 focus:border-discord-blurple focus:outline-none"
        />
      </div>

      {/* Sounds Grid */}
      {filteredSounds.length === 0 ? (
        <div className="text-center py-12">
          {sounds.length === 0 ? (
            <>
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-xl text-discord-light mb-2">No sounds uploaded yet</h3>
              <p className="text-discord-light">
                Upload your first sound file to get started!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl text-discord-light mb-2">No sounds found</h3>
              <p className="text-discord-light">
                Try adjusting your search filter
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSounds.map((sound) => (
            <div
              key={sound.filename}
              className="bg-discord-dark rounded-lg p-4 hover:bg-discord-dark/80 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white truncate flex-1">
                  {sound.name}
                </h3>
                <button
                  onClick={() => handleDelete(sound)}
                  className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                  title="Delete sound"
                >
                  🗑️
                </button>
              </div>
              
              <div className="text-xs text-discord-light mb-3">
                {formatFileSize(sound.size)}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => onPlaySound(sound.name)}
                  className="flex-1 bg-discord-blurple hover:bg-discord-blurple/80 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                >
                  ▶️ Play
                </button>
                
                <audio controls className="hidden" preload="none">
                  <source src={`http://localhost:3001${sound.path}`} />
                </audio>
                
                <button
                  onClick={() => {
                    const audio = new Audio(`http://localhost:3001${sound.path}`);
                    audio.play();
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded transition-colors text-sm"
                  title="Preview locally"
                >
                  🎧
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoundBoard;