class HotkeyManager {
  constructor() {
    this.hotkeyMappings = new Map();
    this.apiClient = new ApiClient();
    this.storage = new StorageManager();
    this.registeredHotkeys = new Set();
    this.isInitialized = false;

    this.init();
  }

  async init() {
    try {
      console.log('Initializing Discord Soundboard Hotkeys...');

      // Update status display
      this.updateStatus('Connecting to backend...');

      // Load hotkey mappings from backend
      await this.loadHotkeyMappings();

      // Register predefined hotkeys
      this.registerPredefinedHotkeys();

      // Register custom hotkeys
      await this.registerCustomHotkeys();

      // Listen for hotkey events
      this.setupHotkeyListeners();

      // Listen for backend updates
      this.setupBackendSync();

      this.isInitialized = true;
      this.updateStatus('Connected and ready');

      console.log('Discord Soundboard Hotkeys initialized successfully');
    } catch (error) {
      console.error('Failed to initialize hotkey manager:', error);
      this.updateStatus('Failed to connect');
    }
  }

  updateStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  async loadHotkeyMappings() {
    try {
      const mappings = await this.apiClient.getHotkeys();
      this.updateHotkeyMappings(mappings);
      console.log(`Loaded ${mappings.length} hotkey mappings`);
    } catch (error) {
      console.error('Failed to load hotkey mappings:', error);
      // Try to load from local storage as fallback
      const cachedMappings = await this.storage.getHotkeys();
      if (cachedMappings) {
        this.updateHotkeyMappings(cachedMappings);
        console.log('Loaded cached hotkey mappings');
      }
    }
  }

  updateHotkeyMappings(mappings) {
    this.hotkeyMappings.clear();
    mappings.forEach(mapping => {
      if (mapping.enabled) {
        const hotkeyKey = this.generateHotkeyKey(mapping);
        this.hotkeyMappings.set(hotkeyKey, mapping);
      }
    });

    // Cache mappings locally
    this.storage.saveHotkeys(mappings);
  }

  generateHotkeyKey(mapping) {
    const modifiers = [];
    if (mapping.modifiers.ctrl) modifiers.push('ctrl');
    if (mapping.modifiers.alt) modifiers.push('alt');
    if (mapping.modifiers.shift) modifiers.push('shift');

    return `${modifiers.join('+')}+${mapping.keyCode}`;
  }

  registerPredefinedHotkeys() {
    // Register the toggle settings hotkey
    overwolf.settings.hotkeys.onPressed.addListener((event) => {
      if (event.name === 'soundboard_toggle') {
        this.toggleSettingsWindow();
      }
    });
  }

  async registerCustomHotkeys() {
    // Register dynamic hotkeys for sound triggering
    for (const [hotkeyKey, mapping] of this.hotkeyMappings) {
      try {
        await this.registerDynamicHotkey(mapping);
      } catch (error) {
        console.error(`Failed to register hotkey for ${mapping.name}:`, error);
      }
    }
  }

  async registerDynamicHotkey(mapping) {
    const hotkeyDefinition = {
      [`sound_${mapping.id}`]: {
        title: `Play ${mapping.name}`,
        action: 'custom',
        modifiers: mapping.modifiers,
        key: mapping.keyCode
      }
    };

    // Note: Overwolf has limitations on dynamic hotkey registration
    // This is a conceptual implementation - actual implementation may need
    // to use global key listeners or other approaches
    console.log('Would register hotkey:', hotkeyDefinition);
  }

  setupHotkeyListeners() {
    // Listen for all hotkey presses
    overwolf.settings.hotkeys.onPressed.addListener(
      this.handleHotkeyPress.bind(this)
    );

    // Alternative: Use keyboard hook for custom hotkeys
    this.setupKeyboardHook();
  }

  setupKeyboardHook() {
    // Global keyboard listener for custom hotkey combinations
    document.addEventListener('keydown', (event) => {
      if (!this.isInitialized) return;

      const hotkeyKey = this.generateHotkeyKeyFromEvent(event);
      const mapping = this.hotkeyMappings.get(hotkeyKey);

      if (mapping) {
        event.preventDefault();
        this.triggerSound(mapping);
      }
    });
  }

  generateHotkeyKeyFromEvent(event) {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');

    return `${modifiers.join('+')}+${event.keyCode}`;
  }

  async handleHotkeyPress(event) {
    console.log('Hotkey pressed:', event.name);

    if (event.name === 'soundboard_toggle') {
      this.toggleSettingsWindow();
      return;
    }

    // Handle custom sound hotkeys
    if (event.name.startsWith('sound_')) {
      const mappingId = event.name.replace('sound_', '');
      const mapping = Array.from(this.hotkeyMappings.values())
        .find(m => m.id === mappingId);

      if (mapping) {
        await this.triggerSound(mapping);
      }
    }
  }

  async triggerSound(mapping) {
    try {
      console.log(`Triggering sound: ${mapping.name} (${mapping.soundFile})`);

      await this.apiClient.playSound(mapping.soundFile, null, 'hotkey');

      // Visual feedback could be added here
      this.showSoundFeedback(mapping.name);

    } catch (error) {
      console.error(`Failed to trigger sound ${mapping.name}:`, error);
      this.showErrorFeedback(`Failed to play ${mapping.name}`);
    }
  }

  showSoundFeedback(soundName) {
    // Could show a small overlay notification
    console.log(`✓ Played: ${soundName}`);
  }

  showErrorFeedback(message) {
    console.error(`✗ ${message}`);
  }

  toggleSettingsWindow() {
    overwolf.windows.obtainDeclaredWindow('settings', (result) => {
      if (result.success) {
        overwolf.windows.restore(result.window.id);
      }
    });
  }

  setupBackendSync() {
    // Periodically sync with backend for hotkey updates
    setInterval(async () => {
      try {
        await this.loadHotkeyMappings();
        await this.registerCustomHotkeys();
      } catch (error) {
        console.error('Failed to sync with backend:', error);
      }
    }, 30000); // Sync every 30 seconds
  }

  // Public methods for settings window communication
  async refreshHotkeys() {
    await this.loadHotkeyMappings();
    await this.registerCustomHotkeys();
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      hotkeyCount: this.hotkeyMappings.size,
      backendConnected: this.apiClient.isConnected()
    };
  }
}

// Initialize the hotkey manager when the background page loads
let hotkeyManager;

window.addEventListener('load', () => {
  hotkeyManager = new HotkeyManager();
});

// Expose globally for settings window
window.hotkeyManager = hotkeyManager;