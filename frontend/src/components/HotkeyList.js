import React, { useState } from 'react';

const HotkeyList = ({ hotkeys, onEdit, onDelete, onToggle }) => {
  const [filter, setFilter] = useState('');

  const formatHotkeyString = (hotkey) => {
    const parts = [];
    if (hotkey.modifiers.ctrl) parts.push('Ctrl');
    if (hotkey.modifiers.alt) parts.push('Alt');
    if (hotkey.modifiers.shift) parts.push('Shift');

    // Convert keyCode to readable key name
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

  const filteredHotkeys = hotkeys.filter(hotkey =>
    hotkey.name.toLowerCase().includes(filter.toLowerCase()) ||
    hotkey.soundFile.toLowerCase().includes(filter.toLowerCase())
  );

  const handleToggle = async (hotkey) => {
    const result = await onToggle(hotkey.id, { enabled: !hotkey.enabled });
    if (!result.success) {
      alert(`Failed to update hotkey: ${result.error}`);
    }
  };

  const handleDelete = async (hotkey) => {
    if (window.confirm(`Are you sure you want to delete the hotkey "${hotkey.name}"?`)) {
      const result = await onDelete(hotkey.id);
      if (!result.success) {
        alert(`Failed to delete hotkey: ${result.error}`);
      }
    }
  };

  return (
    <div>
      {/* Search Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search hotkeys..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-discord-dark text-white px-4 py-2 rounded-lg border border-discord-light/20 focus:border-discord-blurple focus:outline-none"
        />
      </div>

      {/* Hotkeys List */}
      {filteredHotkeys.length === 0 ? (
        <div className="text-center py-12">
          {hotkeys.length === 0 ? (
            <>
              <div className="text-6xl mb-4">⌨️</div>
              <h3 className="text-xl text-discord-light mb-2">No hotkeys configured</h3>
              <p className="text-discord-light">
                Create your first hotkey to get started with global shortcuts!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl text-discord-light mb-2">No hotkeys found</h3>
              <p className="text-discord-light">
                Try adjusting your search filter
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHotkeys.map((hotkey) => (
            <div
              key={hotkey.id}
              className={`bg-discord-dark rounded-lg p-4 border-l-4 transition-all ${
                hotkey.enabled
                  ? 'border-green-400 hover:bg-discord-dark/80'
                  : 'border-gray-600 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-white">
                      {hotkey.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hotkey.enabled
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-gray-600/20 text-gray-400'
                    }`}>
                      {hotkey.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-discord-light">Key:</span>
                      <kbd className="bg-discord-darker px-2 py-1 rounded font-mono text-discord-blurple">
                        {formatHotkeyString(hotkey)}
                      </kbd>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-discord-light">Sound:</span>
                      <span className="text-white">{hotkey.soundFile}</span>
                    </div>
                  </div>

                  <div className="text-xs text-discord-light mt-2">
                    Created: {new Date(hotkey.createdAt).toLocaleDateString()}
                    {hotkey.updatedAt !== hotkey.createdAt && (
                      <span className="ml-4">
                        Updated: {new Date(hotkey.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hotkey.enabled}
                      onChange={() => handleToggle(hotkey)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-discord-blurple"></div>
                  </label>

                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(hotkey)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    title="Edit hotkey"
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(hotkey)}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    title="Delete hotkey"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {hotkeys.length > 0 && (
        <div className="mt-6 p-4 bg-discord-dark rounded-lg">
          <div className="flex justify-between text-sm text-discord-light">
            <span>Total Hotkeys: {hotkeys.length}</span>
            <span>Enabled: {hotkeys.filter(h => h.enabled).length}</span>
            <span>Disabled: {hotkeys.filter(h => !h.enabled).length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotkeyList;