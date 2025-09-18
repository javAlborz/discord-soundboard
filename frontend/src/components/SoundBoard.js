import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SoundBoard = ({ sounds, onPlaySound, onDeleteSound }) => {
  const [filter, setFilter] = useState('');
  const [hotkeys, setHotkeys] = useState([]);
  const [showHotkeyAssignment, setShowHotkeyAssignment] = useState(null);

  useEffect(() => {
    fetchHotkeys();
  }, []);

  const fetchHotkeys = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hotkeys`);
      if (response.ok) {
        const data = await response.json();
        setHotkeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch hotkeys:', error);
    }
  };

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

  const formatHotkeyString = (hotkey) => {
    const parts = [];
    if (hotkey.modifiers.ctrl) parts.push('Ctrl');
    if (hotkey.modifiers.alt) parts.push('Alt');
    if (hotkey.modifiers.shift) parts.push('Shift');

    const keyName = keyCodeToString(hotkey.keyCode);
    parts.push(keyName);

    return parts.join(' + ');
  };

  const keyCodeToString = (keyCode) => {
    const keyMap = {
      8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
      19: 'Pause', 20: 'CapsLock', 27: 'Escape', 32: 'Space', 33: 'PageUp',
      34: 'PageDown', 35: 'End', 36: 'Home', 37: 'ArrowLeft', 38: 'ArrowUp',
      39: 'ArrowRight', 40: 'ArrowDown', 45: 'Insert', 46: 'Delete',
      112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
      118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12'
    };

    if (keyMap[keyCode]) {
      return keyMap[keyCode];
    }

    if ((keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57)) {
      return String.fromCharCode(keyCode);
    }

    return `Key${keyCode}`;
  };

  const getHotkeysForSound = (soundFilename) => {
    return hotkeys.filter(hotkey =>
      hotkey.soundFile === soundFilename && hotkey.enabled
    );
  };

  const createQuickHotkey = async (soundFilename, soundName) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-discord-darker p-6 rounded-lg max-w-md w-full mx-4">
        <h3 class="text-xl font-semibold text-white mb-4">Quick Hotkey Assignment</h3>
        <p class="text-discord-light mb-4">Press a key combination for "${soundName}"</p>

        <div class="mb-4">
          <div class="flex space-x-4 mb-3">
            <label class="flex items-center space-x-2">
              <input type="checkbox" id="quick-ctrl" class="rounded">
              <span class="text-white">Ctrl</span>
            </label>
            <label class="flex items-center space-x-2">
              <input type="checkbox" id="quick-alt" class="rounded">
              <span class="text-white">Alt</span>
            </label>
            <label class="flex items-center space-x-2">
              <input type="checkbox" id="quick-shift" class="rounded">
              <span class="text-white">Shift</span>
            </label>
          </div>

          <input
            type="text"
            id="quick-key-display"
            placeholder="Press any key..."
            readonly
            class="w-full bg-discord-dark text-white px-4 py-2 rounded border border-discord-light/20"
          />
        </div>

        <div class="flex justify-end space-x-3">
          <button id="quick-cancel" class="px-4 py-2 text-discord-light hover:text-white">Cancel</button>
          <button id="quick-save" class="px-4 py-2 bg-discord-blurple text-white rounded" disabled>Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let keyCode = null;
    const keyDisplay = modal.querySelector('#quick-key-display');
    const saveBtn = modal.querySelector('#quick-save');

    // Key recording
    const handleKeyDown = (e) => {
      e.preventDefault();
      if (![16, 17, 18].includes(e.keyCode)) { // Not modifier keys
        keyCode = e.keyCode >= 97 && e.keyCode <= 122 ? e.keyCode - 32 : e.keyCode;
        keyDisplay.value = keyCodeToString(keyCode);
        saveBtn.disabled = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    // Event handlers
    modal.querySelector('#quick-cancel').onclick = () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.removeChild(modal);
    };

    modal.querySelector('#quick-save').onclick = async () => {
      const ctrl = modal.querySelector('#quick-ctrl').checked;
      const alt = modal.querySelector('#quick-alt').checked;
      const shift = modal.querySelector('#quick-shift').checked;

      if (!ctrl && !alt && !shift) {
        alert('Please select at least one modifier key (Ctrl, Alt, or Shift)');
        return;
      }

      const hotkeyData = {
        name: `Quick: ${soundName}`,
        soundFile: soundFilename,
        keyCode: keyCode,
        modifiers: { ctrl, alt, shift },
        enabled: true
      };

      try {
        const response = await fetch(`${API_URL}/api/hotkeys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hotkeyData)
        });

        if (response.ok) {
          fetchHotkeys();
          document.removeEventListener('keydown', handleKeyDown, true);
          document.body.removeChild(modal);
        } else {
          const error = await response.json();
          alert(`Failed to create hotkey: ${error.error}`);
        }
      } catch (error) {
        console.error('Error creating hotkey:', error);
        alert('Failed to create hotkey');
      }
    };
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
          {filteredSounds.map((sound) => {
            const soundHotkeys = getHotkeysForSound(sound.filename);

            return (
              <div
                key={sound.filename}
                className="bg-discord-dark rounded-lg p-4 hover:bg-discord-dark/80 transition-colors group relative"
              >
                {/* Hotkey Indicators */}
                {soundHotkeys.length > 0 && (
                  <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                    {soundHotkeys.slice(0, 2).map((hotkey, index) => (
                      <kbd
                        key={hotkey.id}
                        className="bg-discord-blurple/20 text-discord-blurple text-xs px-2 py-1 rounded font-mono"
                        title={`${hotkey.name}: ${formatHotkeyString(hotkey)}`}
                      >
                        {formatHotkeyString(hotkey)}
                      </kbd>
                    ))}
                    {soundHotkeys.length > 2 && (
                      <span className="bg-discord-blurple/20 text-discord-blurple text-xs px-2 py-1 rounded">
                        +{soundHotkeys.length - 2}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white truncate flex-1 pr-2">
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

                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={() => onPlaySound(sound.name)}
                    className="flex-1 bg-discord-blurple hover:bg-discord-blurple/80 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                  >
                    ▶️ Play
                  </button>

                  <button
                    onClick={() => {
                      const audio = new Audio(`${API_URL}${sound.path}`);
                      audio.play();
                    }}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded transition-colors text-sm"
                    title="Preview locally"
                  >
                    🎧
                  </button>
                </div>

                {/* Hotkey Actions */}
                <div className="flex space-x-2">
                  {soundHotkeys.length === 0 ? (
                    <button
                      onClick={() => createQuickHotkey(sound.filename, sound.name)}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded transition-colors text-xs font-medium"
                      title="Create hotkey for this sound"
                    >
                      ⌨️ Add Hotkey
                    </button>
                  ) : (
                    <div className="flex-1 text-center">
                      <span className="text-green-400 text-xs font-medium">
                        ✓ {soundHotkeys.length} hotkey{soundHotkeys.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setShowHotkeyAssignment(sound)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors text-xs"
                    title="Manage hotkeys"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hotkey Assignment Modal */}
      {showHotkeyAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-discord-darker p-6 rounded-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">
              Hotkeys for "{showHotkeyAssignment.name}"
            </h3>

            {getHotkeysForSound(showHotkeyAssignment.filename).length === 0 ? (
              <p className="text-discord-light mb-4">No hotkeys assigned to this sound.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {getHotkeysForSound(showHotkeyAssignment.filename).map(hotkey => (
                  <div key={hotkey.id} className="bg-discord-dark p-3 rounded flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">{hotkey.name}</div>
                      <kbd className="bg-discord-blurple/20 text-discord-blurple text-xs px-2 py-1 rounded font-mono">
                        {formatHotkeyString(hotkey)}
                      </kbd>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      hotkey.enabled
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {hotkey.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowHotkeyAssignment(null)}
                className="px-4 py-2 text-discord-light hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  createQuickHotkey(showHotkeyAssignment.filename, showHotkeyAssignment.name);
                  setShowHotkeyAssignment(null);
                }}
                className="px-4 py-2 bg-discord-blurple text-white rounded"
              >
                Add Hotkey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundBoard;