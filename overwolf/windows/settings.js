class SettingsApp {
  constructor() {
    this.apiClient = new ApiClient();
    this.storage = new StorageManager();
    this.currentEditingHotkey = null;
    this.isRecordingKey = false;
    this.sounds = [];
    this.hotkeys = [];
    this.settings = {};

    this.init();
  }

  async init() {
    try {
      this.showLoading();

      // Initialize UI event listeners
      this.setupEventListeners();

      // Load data
      await this.loadSettings();
      await this.loadSounds();
      await this.loadHotkeys();

      // Setup window controls
      this.setupWindowControls();

      // Update status
      this.updateStatus();

      this.hideLoading();
      this.showNotification('Connected successfully', 'success');
    } catch (error) {
      console.error('Failed to initialize settings app:', error);
      this.hideLoading();
      this.showNotification('Failed to connect to backend', 'error');
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Hotkey form
    document.getElementById('add-hotkey-btn').addEventListener('click', () => {
      this.showHotkeyForm();
    });

    document.getElementById('cancel-hotkey-btn').addEventListener('click', () => {
      this.hideHotkeyForm();
    });

    document.getElementById('hotkey-form-element').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveHotkey();
    });

    // Key recording
    document.getElementById('record-key-btn').addEventListener('click', () => {
      this.startKeyRecording();
    });

    // Sounds
    document.getElementById('refresh-sounds-btn').addEventListener('click', () => {
      this.loadSounds();
    });

    // Settings
    document.getElementById('save-settings-btn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
      this.resetSettings();
    });

    document.getElementById('clear-all-hotkeys-btn').addEventListener('click', () => {
      this.clearAllHotkeys();
    });
  }

  setupWindowControls() {
    document.getElementById('minimize-btn').addEventListener('click', () => {
      overwolf.windows.getCurrentWindow((result) => {
        overwolf.windows.minimize(result.window.id);
      });
    });

    document.getElementById('close-btn').addEventListener('click', () => {
      overwolf.windows.getCurrentWindow((result) => {
        overwolf.windows.close(result.window.id);
      });
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data if needed
    if (tabName === 'sounds') {
      this.loadSounds();
    }
  }

  async loadSettings() {
    try {
      this.settings = await this.storage.getSettings();
      this.populateSettingsForm();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadSounds() {
    try {
      this.sounds = await this.apiClient.getSounds();
      this.populateSoundsList();
      this.populateSoundSelect();
    } catch (error) {
      console.error('Failed to load sounds:', error);
      this.showNotification('Failed to load sounds', 'error');
    }
  }

  async loadHotkeys() {
    try {
      this.hotkeys = await this.apiClient.getHotkeys();
      this.populateHotkeysList();
      this.updateHotkeyCount();
    } catch (error) {
      console.error('Failed to load hotkeys:', error);
      this.showNotification('Failed to load hotkeys', 'error');
    }
  }

  populateSettingsForm() {
    document.getElementById('auto-start').checked = this.settings.autoStart || false;
    document.getElementById('show-notifications').checked = this.settings.notifications || true;
    document.getElementById('conflict-resolution').value = this.settings.conflictResolution || 'warn';
  }

  populateSoundsList() {
    const container = document.getElementById('sounds-list');

    if (this.sounds.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>No sounds available</h3><p>Upload sounds through the web dashboard</p></div>';
      return;
    }

    container.innerHTML = this.sounds.map(sound => `
      <div class="sound-item" onclick="settingsApp.previewSound('${sound.filename}')">
        <div class="sound-name">${sound.name}</div>
        <div class="sound-filename">${sound.filename}</div>
        <div class="sound-size">${Utils.formatFileSize(sound.size)}</div>
      </div>
    `).join('');
  }

  populateSoundSelect() {
    const select = document.getElementById('sound-select');
    select.innerHTML = '<option value="">Select a sound...</option>' +
      this.sounds.map(sound => `<option value="${sound.filename}">${sound.name}</option>`).join('');
  }

  populateHotkeysList() {
    const container = document.getElementById('hotkey-list');

    if (this.hotkeys.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>No hotkeys configured</h3><p>Click "Add Hotkey" to create your first hotkey</p></div>';
      return;
    }

    container.innerHTML = this.hotkeys.map(hotkey => `
      <div class="hotkey-item">
        <div class="hotkey-info">
          <div class="hotkey-name">${Utils.escapeHtml(hotkey.name)}</div>
          <div class="hotkey-combination">${Utils.formatHotkeyString(hotkey)}</div>
          <div class="hotkey-sound">Sound: ${hotkey.soundFile}</div>
        </div>
        <div class="hotkey-actions">
          <input type="checkbox" class="hotkey-toggle" ${hotkey.enabled ? 'checked' : ''}
                 onchange="settingsApp.toggleHotkey('${hotkey.id}', this.checked)">
          <button class="btn btn-secondary" onclick="settingsApp.editHotkey('${hotkey.id}')">Edit</button>
          <button class="btn btn-danger" onclick="settingsApp.deleteHotkey('${hotkey.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  showHotkeyForm(hotkey = null) {
    this.currentEditingHotkey = hotkey;
    const form = document.getElementById('hotkey-form');
    const title = document.getElementById('form-title');

    if (hotkey) {
      title.textContent = 'Edit Hotkey';
      this.populateHotkeyForm(hotkey);
    } else {
      title.textContent = 'Add New Hotkey';
      this.clearHotkeyForm();
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  hideHotkeyForm() {
    document.getElementById('hotkey-form').style.display = 'none';
    this.currentEditingHotkey = null;
    this.clearHotkeyForm();
  }

  populateHotkeyForm(hotkey) {
    document.getElementById('hotkey-name').value = hotkey.name;
    document.getElementById('sound-select').value = hotkey.soundFile;
    document.getElementById('ctrl-modifier').checked = hotkey.modifiers.ctrl;
    document.getElementById('alt-modifier').checked = hotkey.modifiers.alt;
    document.getElementById('shift-modifier').checked = hotkey.modifiers.shift;
    document.getElementById('key-display').value = Utils.keyCodeToString(hotkey.keyCode);
    document.getElementById('key-code').value = hotkey.keyCode;
    document.getElementById('hotkey-enabled').checked = hotkey.enabled;
  }

  clearHotkeyForm() {
    document.getElementById('hotkey-form-element').reset();
    document.getElementById('key-display').value = '';
    document.getElementById('key-code').value = '';
  }

  startKeyRecording() {
    const button = document.getElementById('record-key-btn');
    const display = document.getElementById('key-display');

    if (this.isRecordingKey) return;

    this.isRecordingKey = true;
    button.textContent = 'Press a key...';
    button.disabled = true;
    display.value = 'Press any key...';

    const keyHandler = (e) => {
      e.preventDefault();

      if (!Utils.isModifierKey(e.keyCode)) {
        const keyCode = Utils.normalizeKeyCode(e.keyCode);
        document.getElementById('key-code').value = keyCode;
        display.value = Utils.keyCodeToString(keyCode);

        this.isRecordingKey = false;
        button.textContent = 'Record Key';
        button.disabled = false;

        document.removeEventListener('keydown', keyHandler, true);
      }
    };

    document.addEventListener('keydown', keyHandler, true);

    // Auto-cancel after 10 seconds
    setTimeout(() => {
      if (this.isRecordingKey) {
        this.isRecordingKey = false;
        button.textContent = 'Record Key';
        button.disabled = false;
        display.value = '';
        document.removeEventListener('keydown', keyHandler, true);
      }
    }, 10000);
  }

  async saveHotkey() {
    try {
      const hotkeyData = {
        name: document.getElementById('hotkey-name').value.trim(),
        soundFile: document.getElementById('sound-select').value,
        keyCode: parseInt(document.getElementById('key-code').value),
        modifiers: {
          ctrl: document.getElementById('ctrl-modifier').checked,
          alt: document.getElementById('alt-modifier').checked,
          shift: document.getElementById('shift-modifier').checked
        },
        enabled: document.getElementById('hotkey-enabled').checked
      };

      // Validate hotkey data
      const validation = Utils.validateHotkeyData(hotkeyData);
      if (!validation.valid) {
        this.showNotification(`Validation failed: ${validation.errors.join(', ')}`, 'error');
        return;
      }

      // Check for conflicts
      const conflictCheck = await this.apiClient.validateHotkey(hotkeyData);
      if (!conflictCheck.valid && this.settings.conflictResolution === 'prevent') {
        this.showNotification('Hotkey combination already in use', 'error');
        return;
      }

      let result;
      if (this.currentEditingHotkey) {
        result = await this.apiClient.updateHotkey(this.currentEditingHotkey.id, hotkeyData);
        this.showNotification('Hotkey updated successfully', 'success');
      } else {
        result = await this.apiClient.createHotkey(hotkeyData);
        this.showNotification('Hotkey created successfully', 'success');
      }

      this.hideHotkeyForm();
      await this.loadHotkeys();

      // Notify background page to refresh
      if (window.hotkeyManager) {
        await window.hotkeyManager.refreshHotkeys();
      }

    } catch (error) {
      console.error('Failed to save hotkey:', error);
      this.showNotification(`Failed to save hotkey: ${error.message}`, 'error');
    }
  }

  async toggleHotkey(id, enabled) {
    try {
      await this.apiClient.updateHotkey(id, { enabled });
      await this.loadHotkeys();

      if (window.hotkeyManager) {
        await window.hotkeyManager.refreshHotkeys();
      }

      this.showNotification(`Hotkey ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Failed to toggle hotkey:', error);
      this.showNotification('Failed to update hotkey', 'error');
    }
  }

  editHotkey(id) {
    const hotkey = this.hotkeys.find(h => h.id === id);
    if (hotkey) {
      this.showHotkeyForm(hotkey);
    }
  }

  async deleteHotkey(id) {
    if (!confirm('Are you sure you want to delete this hotkey?')) {
      return;
    }

    try {
      await this.apiClient.deleteHotkey(id);
      await this.loadHotkeys();

      if (window.hotkeyManager) {
        await window.hotkeyManager.refreshHotkeys();
      }

      this.showNotification('Hotkey deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete hotkey:', error);
      this.showNotification('Failed to delete hotkey', 'error');
    }
  }

  async saveSettings() {
    try {
      this.settings = {
        autoStart: document.getElementById('auto-start').checked,
        notifications: document.getElementById('show-notifications').checked,
        conflictResolution: document.getElementById('conflict-resolution').value
      };

      await this.storage.saveSettings(this.settings);
      this.showNotification('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Reset all settings to defaults?')) {
      return;
    }

    this.settings = {
      autoStart: true,
      notifications: true,
      conflictResolution: 'warn'
    };

    await this.storage.saveSettings(this.settings);
    this.populateSettingsForm();
    this.showNotification('Settings reset to defaults', 'success');
  }

  async clearAllHotkeys() {
    if (!confirm('This will delete ALL hotkeys. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      const deletePromises = this.hotkeys.map(hotkey =>
        this.apiClient.deleteHotkey(hotkey.id)
      );

      await Promise.all(deletePromises);
      await this.loadHotkeys();

      if (window.hotkeyManager) {
        await window.hotkeyManager.refreshHotkeys();
      }

      this.showNotification('All hotkeys cleared', 'success');
    } catch (error) {
      console.error('Failed to clear hotkeys:', error);
      this.showNotification('Failed to clear some hotkeys', 'error');
    }
  }

  previewSound(filename) {
    // Play sound preview
    const audio = new Audio(`http://localhost:3051/sounds/${filename}`);
    audio.volume = 0.5;
    audio.play().catch(error => {
      console.error('Failed to preview sound:', error);
      this.showNotification('Failed to preview sound', 'error');
    });
  }

  updateStatus() {
    const backendStatus = document.getElementById('backend-status');
    const hotkeyCount = document.getElementById('hotkey-count');

    if (this.apiClient.isConnected()) {
      backendStatus.textContent = 'Connected';
      backendStatus.style.color = '#43b581';
    } else {
      backendStatus.textContent = 'Disconnected';
      backendStatus.style.color = '#ed4245';
    }
  }

  updateHotkeyCount() {
    const enabledCount = this.hotkeys.filter(h => h.enabled).length;
    document.getElementById('hotkey-count').textContent = enabledCount;
  }

  showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
  }

  hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Initialize the settings app
let settingsApp;
window.addEventListener('load', () => {
  settingsApp = new SettingsApp();
});

// Expose globally for inline event handlers
window.settingsApp = settingsApp;