// Utility functions for the Overwolf Discord Soundboard Hotkeys app

class Utils {
  static keyCodeToString(keyCode) {
    const keyMap = {
      8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
      19: 'Pause', 20: 'CapsLock', 27: 'Escape', 32: 'Space', 33: 'PageUp',
      34: 'PageDown', 35: 'End', 36: 'Home', 37: 'ArrowLeft', 38: 'ArrowUp',
      39: 'ArrowRight', 40: 'ArrowDown', 45: 'Insert', 46: 'Delete',
      112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
      118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
      96: 'Num0', 97: 'Num1', 98: 'Num2', 99: 'Num3', 100: 'Num4',
      101: 'Num5', 102: 'Num6', 103: 'Num7', 104: 'Num8', 105: 'Num9',
      106: 'Num*', 107: 'Num+', 109: 'Num-', 110: 'Num.', 111: 'Num/',
      186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`',
      219: '[', 220: '\\', 221: ']', 222: "'"
    };

    if (keyMap[keyCode]) {
      return keyMap[keyCode];
    }

    // For A-Z (65-90) and 0-9 (48-57)
    if ((keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57)) {
      return String.fromCharCode(keyCode);
    }

    return `Key${keyCode}`;
  }

  static formatHotkeyString(hotkey) {
    const parts = [];
    if (hotkey.modifiers.ctrl) parts.push('Ctrl');
    if (hotkey.modifiers.alt) parts.push('Alt');
    if (hotkey.modifiers.shift) parts.push('Shift');

    const keyName = Utils.keyCodeToString(hotkey.keyCode);
    parts.push(keyName);

    return parts.join(' + ');
  }

  static isValidKeyCode(keyCode) {
    // Check if keyCode is in valid range
    return (keyCode >= 8 && keyCode <= 255) && keyCode !== 0;
  }

  static isModifierKey(keyCode) {
    return [16, 17, 18].includes(keyCode); // Shift, Ctrl, Alt
  }

  static normalizeKeyCode(keyCode) {
    // Normalize key codes for consistency
    if (keyCode >= 97 && keyCode <= 122) {
      // Convert lowercase to uppercase
      return keyCode - 32;
    }
    return keyCode;
  }

  static validateHotkeyData(hotkeyData) {
    const errors = [];

    if (!hotkeyData.name || hotkeyData.name.trim() === '') {
      errors.push('Hotkey name is required');
    }

    if (!hotkeyData.soundFile || hotkeyData.soundFile.trim() === '') {
      errors.push('Sound file is required');
    }

    if (!hotkeyData.keyCode || !Utils.isValidKeyCode(hotkeyData.keyCode)) {
      errors.push('Valid key code is required');
    }

    if (Utils.isModifierKey(hotkeyData.keyCode)) {
      errors.push('Cannot use modifier keys as main key');
    }

    if (!hotkeyData.modifiers ||
        typeof hotkeyData.modifiers !== 'object' ||
        (!hotkeyData.modifiers.ctrl && !hotkeyData.modifiers.alt && !hotkeyData.modifiers.shift)) {
      errors.push('At least one modifier key (Ctrl, Alt, or Shift) is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  static generateHotkeyId(hotkey) {
    const modifiers = [];
    if (hotkey.modifiers.ctrl) modifiers.push('ctrl');
    if (hotkey.modifiers.alt) modifiers.push('alt');
    if (hotkey.modifiers.shift) modifiers.push('shift');

    return `${modifiers.join('+')}+${hotkey.keyCode}`;
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  static showNotification(title, message, type = 'info') {
    // Show a system notification if available
    if (typeof overwolf !== 'undefined' && overwolf.notifications) {
      overwolf.notifications.show({
        title: title,
        message: message,
        icon: 'assets/icon.png'
      });
    } else {
      // Fallback to console log
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }

  static copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve();
    }
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  static isOverwolfEnvironment() {
    return typeof overwolf !== 'undefined';
  }

  static async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static createUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static logError(error, context = '') {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    console.error('Error:', errorInfo);

    // In a production app, you might want to send this to a logging service
    // Utils.sendErrorToService(errorInfo);
  }

  static async retry(asyncFunction, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await asyncFunction();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await Utils.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
}