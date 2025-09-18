import React, { useState, useEffect } from 'react';
import HotkeyList from './HotkeyList';
import HotkeyEditor from './HotkeyEditor';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const HotkeyManager = ({ sounds }) => {
  const [hotkeys, setHotkeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingHotkey, setEditingHotkey] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    fetchHotkeys();
    checkConflicts();
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
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/hotkeys/conflicts`);
      if (response.ok) {
        const data = await response.json();
        setConflicts(data);
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const createHotkey = async (hotkeyData) => {
    try {
      const response = await fetch(`${API_URL}/api/hotkeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hotkeyData),
      });

      if (response.ok) {
        const newHotkey = await response.json();
        setHotkeys(prev => [...prev, newHotkey]);
        setShowEditor(false);
        checkConflicts();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Failed to create hotkey:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const updateHotkey = async (id, hotkeyData) => {
    try {
      const response = await fetch(`${API_URL}/api/hotkeys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hotkeyData),
      });

      if (response.ok) {
        const updatedHotkey = await response.json();
        setHotkeys(prev =>
          prev.map(h => h.id === id ? updatedHotkey : h)
        );
        setEditingHotkey(null);
        setShowEditor(false);
        checkConflicts();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Failed to update hotkey:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const deleteHotkey = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/hotkeys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHotkeys(prev => prev.filter(h => h.id !== id));
        checkConflicts();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      console.error('Failed to delete hotkey:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const validateHotkey = async (hotkeyData) => {
    try {
      const response = await fetch(`${API_URL}/api/hotkeys/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hotkeyData),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to validate hotkey:', error);
    }
    return { valid: false, conflicts: [] };
  };

  const handleEdit = (hotkey) => {
    setEditingHotkey(hotkey);
    setShowEditor(true);
  };

  const handleSave = async (hotkeyData) => {
    if (editingHotkey) {
      return await updateHotkey(editingHotkey.id, hotkeyData);
    } else {
      return await createHotkey(hotkeyData);
    }
  };

  const handleCancel = () => {
    setEditingHotkey(null);
    setShowEditor(false);
  };

  if (loading) {
    return (
      <div className="bg-discord-darker rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-discord-light">Loading hotkeys...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-discord-darker rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Hotkey Management</h2>
          <p className="text-discord-light text-sm mt-1">
            Configure global keyboard shortcuts for your sounds
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {conflicts.length > 0 && (
            <div className="flex items-center text-yellow-400 text-sm">
              <span className="mr-2">⚠️</span>
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => setShowEditor(true)}
            className="bg-discord-blurple hover:bg-discord-blurple/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add Hotkey
          </button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-400 font-medium mb-2">⚠️ Hotkey Conflicts Detected</h3>
          <div className="text-sm text-yellow-300">
            {conflicts.map((conflictPair, index) => (
              <div key={index} className="mb-1">
                "{conflictPair[0].name}" and "{conflictPair[1].name}" share the same key combination
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditor ? (
        <HotkeyEditor
          hotkey={editingHotkey}
          sounds={sounds}
          onSave={handleSave}
          onCancel={handleCancel}
          onValidate={validateHotkey}
        />
      ) : (
        <HotkeyList
          hotkeys={hotkeys}
          onEdit={handleEdit}
          onDelete={deleteHotkey}
          onToggle={updateHotkey}
        />
      )}
    </div>
  );
};

export default HotkeyManager;