import React, { useState, useEffect } from 'react';

const HotkeyEditor = ({ hotkey, sounds, onSave, onCancel, onValidate }) => {
  const [formData, setFormData] = useState({
    name: '',
    soundFile: '',
    keyCode: '',
    modifiers: {
      ctrl: false,
      alt: false,
      shift: false
    },
    enabled: true
  });

  const [keyDisplay, setKeyDisplay] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [validation, setValidation] = useState({ valid: true, conflicts: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hotkey) {
      setFormData({
        name: hotkey.name,
        soundFile: hotkey.soundFile,
        keyCode: hotkey.keyCode,
        modifiers: hotkey.modifiers,
        enabled: hotkey.enabled
      });
      setKeyDisplay(keyCodeToString(hotkey.keyCode));
    }
  }, [hotkey]);

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

  const isModifierKey = (keyCode) => {
    return [16, 17, 18].includes(keyCode); // Shift, Ctrl, Alt
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) {
      errors.push('Hotkey name is required');
    }

    if (!formData.soundFile) {
      errors.push('Sound file is required');
    }

    if (!formData.keyCode) {
      errors.push('Key is required');
    }

    if (!formData.modifiers.ctrl && !formData.modifiers.alt && !formData.modifiers.shift) {
      errors.push('At least one modifier key (Ctrl, Alt, or Shift) is required');
    }

    return errors;
  };

  const handleKeyRecord = () => {
    if (isRecording) return;

    setIsRecording(true);
    setKeyDisplay('Press any key...');

    const handleKeyDown = (e) => {
      e.preventDefault();

      if (!isModifierKey(e.keyCode)) {
        const normalizedKeyCode = e.keyCode >= 97 && e.keyCode <= 122
          ? e.keyCode - 32
          : e.keyCode;

        setFormData(prev => ({
          ...prev,
          keyCode: normalizedKeyCode
        }));
        setKeyDisplay(keyCodeToString(normalizedKeyCode));
        setIsRecording(false);

        document.removeEventListener('keydown', handleKeyDown, true);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    // Auto-cancel after 10 seconds
    setTimeout(() => {
      if (isRecording) {
        setIsRecording(false);
        setKeyDisplay(formData.keyCode ? keyCodeToString(formData.keyCode) : '');
        document.removeEventListener('keydown', handleKeyDown, true);
      }
    }, 10000);
  };

  const handleValidation = async () => {
    if (formData.keyCode &&
        (formData.modifiers.ctrl || formData.modifiers.alt || formData.modifiers.shift)) {
      const validation = await onValidate({
        ...formData,
        id: hotkey?.id
      });
      setValidation(validation);
    }
  };

  useEffect(() => {
    handleValidation();
  }, [formData.keyCode, formData.modifiers]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'));
      return;
    }

    setSaving(true);
    const result = await onSave(formData);
    setSaving(false);

    if (result.success) {
      onCancel(); // Close editor on success
    } else {
      alert(`Failed to save hotkey: ${result.error}`);
    }
  };

  return (
    <div className="bg-discord-dark rounded-lg p-6 border border-discord-light/20">
      <h3 className="text-xl font-semibold text-white mb-6">
        {hotkey ? 'Edit Hotkey' : 'Create New Hotkey'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-discord-light mb-2">
            Hotkey Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter a descriptive name..."
            className="w-full bg-discord-darker text-white px-4 py-2 rounded-lg border border-discord-light/20 focus:border-discord-blurple focus:outline-none"
            required
          />
        </div>

        {/* Sound Selection */}
        <div>
          <label className="block text-sm font-medium text-discord-light mb-2">
            Sound File *
          </label>
          <select
            value={formData.soundFile}
            onChange={(e) => setFormData(prev => ({ ...prev, soundFile: e.target.value }))}
            className="w-full bg-discord-darker text-white px-4 py-2 rounded-lg border border-discord-light/20 focus:border-discord-blurple focus:outline-none"
            required
          >
            <option value="">Select a sound...</option>
            {sounds.map(sound => (
              <option key={sound.filename} value={sound.filename}>
                {sound.name} ({sound.filename})
              </option>
            ))}
          </select>
        </div>

        {/* Key Combination */}
        <div>
          <label className="block text-sm font-medium text-discord-light mb-2">
            Key Combination *
          </label>

          {/* Modifier Keys */}
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.modifiers.ctrl}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  modifiers: { ...prev.modifiers, ctrl: e.target.checked }
                }))}
                className="rounded border-discord-light/20 text-discord-blurple focus:ring-discord-blurple"
              />
              <span className="text-white">Ctrl</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.modifiers.alt}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  modifiers: { ...prev.modifiers, alt: e.target.checked }
                }))}
                className="rounded border-discord-light/20 text-discord-blurple focus:ring-discord-blurple"
              />
              <span className="text-white">Alt</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.modifiers.shift}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  modifiers: { ...prev.modifiers, shift: e.target.checked }
                }))}
                className="rounded border-discord-light/20 text-discord-blurple focus:ring-discord-blurple"
              />
              <span className="text-white">Shift</span>
            </label>
          </div>

          {/* Key Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={keyDisplay}
              readOnly
              placeholder="Click 'Record Key' to set"
              className="flex-1 bg-discord-darker text-white px-4 py-2 rounded-lg border border-discord-light/20 cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleKeyRecord}
              disabled={isRecording}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRecording
                  ? 'bg-yellow-600 text-white cursor-not-allowed'
                  : 'bg-discord-blurple hover:bg-discord-blurple/80 text-white'
              }`}
            >
              {isRecording ? 'Recording...' : 'Record Key'}
            </button>
          </div>

          {/* Validation Display */}
          {formData.keyCode && (
            <div className="mt-2">
              {validation.valid ? (
                <div className="text-green-400 text-sm flex items-center">
                  <span className="mr-2">✓</span>
                  Key combination is available
                </div>
              ) : (
                <div className="text-yellow-400 text-sm">
                  <div className="flex items-center mb-1">
                    <span className="mr-2">⚠️</span>
                    This key combination conflicts with:
                  </div>
                  <ul className="ml-6 list-disc">
                    {validation.conflicts.map((conflict, index) => (
                      <li key={index}>{conflict.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        {formData.keyCode && (formData.modifiers.ctrl || formData.modifiers.alt || formData.modifiers.shift) && (
          <div className="bg-discord-darker p-4 rounded-lg">
            <h4 className="text-sm font-medium text-discord-light mb-2">Preview:</h4>
            <div className="flex items-center space-x-2">
              <kbd className="bg-discord-dark px-3 py-1 rounded font-mono text-discord-blurple">
                {[
                  formData.modifiers.ctrl && 'Ctrl',
                  formData.modifiers.alt && 'Alt',
                  formData.modifiers.shift && 'Shift',
                  keyDisplay
                ].filter(Boolean).join(' + ')}
              </kbd>
              <span className="text-discord-light">→</span>
              <span className="text-white">{formData.soundFile || 'No sound selected'}</span>
            </div>
          </div>
        )}

        {/* Enabled Toggle */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-discord-light/20 text-discord-blurple focus:ring-discord-blurple"
            />
            <span className="text-white">Enable this hotkey</span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-discord-light/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-discord-light hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !validation.valid}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              saving || !validation.valid
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-discord-blurple hover:bg-discord-blurple/80 text-white'
            }`}
          >
            {saving ? 'Saving...' : hotkey ? 'Update Hotkey' : 'Create Hotkey'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HotkeyEditor;