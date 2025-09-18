class StorageManager {
  constructor() {
    this.storageKey = 'discord_soundboard_hotkeys';
  }

  async saveHotkeys(hotkeys) {
    try {
      const data = {
        hotkeys: hotkeys,
        timestamp: Date.now()
      };

      if (typeof overwolf !== 'undefined' && overwolf.io) {
        // Use Overwolf storage if available
        await this.saveToOverwolfStorage(data);
      } else {
        // Fallback to localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }

      console.log('Hotkeys saved to local storage');
    } catch (error) {
      console.error('Failed to save hotkeys to storage:', error);
    }
  }

  async getHotkeys() {
    try {
      let data;

      if (typeof overwolf !== 'undefined' && overwolf.io) {
        // Use Overwolf storage if available
        data = await this.getFromOverwolfStorage();
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(this.storageKey);
        data = stored ? JSON.parse(stored) : null;
      }

      if (data && data.hotkeys) {
        console.log('Loaded hotkeys from local storage');
        return data.hotkeys;
      }

      return [];
    } catch (error) {
      console.error('Failed to load hotkeys from storage:', error);
      return [];
    }
  }

  async saveToOverwolfStorage(data) {
    return new Promise((resolve, reject) => {
      overwolf.io.writeTextFile(
        `${overwolf.io.enums.StorageSpace.appData}/${this.storageKey}.json`,
        JSON.stringify(data),
        true, // overwrite
        (result) => {
          if (result.success) {
            resolve();
          } else {
            reject(new Error(result.error));
          }
        }
      );
    });
  }

  async getFromOverwolfStorage() {
    return new Promise((resolve, reject) => {
      overwolf.io.readTextFile(
        `${overwolf.io.enums.StorageSpace.appData}/${this.storageKey}.json`,
        (result) => {
          if (result.success) {
            try {
              const data = JSON.parse(result.content);
              resolve(data);
            } catch (parseError) {
              reject(parseError);
            }
          } else if (result.error === 'File not found') {
            resolve(null);
          } else {
            reject(new Error(result.error));
          }
        }
      );
    });
  }

  async saveSettings(settings) {
    try {
      const settingsKey = `${this.storageKey}_settings`;
      const data = {
        settings: settings,
        timestamp: Date.now()
      };

      if (typeof overwolf !== 'undefined' && overwolf.io) {
        await this.saveSettingsToOverwolf(data);
      } else {
        localStorage.setItem(settingsKey, JSON.stringify(data));
      }

      console.log('Settings saved to local storage');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  async getSettings() {
    try {
      const settingsKey = `${this.storageKey}_settings`;
      let data;

      if (typeof overwolf !== 'undefined' && overwolf.io) {
        data = await this.getSettingsFromOverwolf();
      } else {
        const stored = localStorage.getItem(settingsKey);
        data = stored ? JSON.parse(stored) : null;
      }

      return data ? data.settings : {
        autoStart: true,
        notifications: true,
        conflictResolution: 'warn'
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {
        autoStart: true,
        notifications: true,
        conflictResolution: 'warn'
      };
    }
  }

  async saveSettingsToOverwolf(data) {
    return new Promise((resolve, reject) => {
      overwolf.io.writeTextFile(
        `${overwolf.io.enums.StorageSpace.appData}/${this.storageKey}_settings.json`,
        JSON.stringify(data),
        true,
        (result) => {
          if (result.success) {
            resolve();
          } else {
            reject(new Error(result.error));
          }
        }
      );
    });
  }

  async getSettingsFromOverwolf() {
    return new Promise((resolve, reject) => {
      overwolf.io.readTextFile(
        `${overwolf.io.enums.StorageSpace.appData}/${this.storageKey}_settings.json`,
        (result) => {
          if (result.success) {
            try {
              const data = JSON.parse(result.content);
              resolve(data);
            } catch (parseError) {
              reject(parseError);
            }
          } else if (result.error === 'File not found') {
            resolve(null);
          } else {
            reject(new Error(result.error));
          }
        }
      );
    });
  }

  async clearStorage() {
    try {
      if (typeof overwolf !== 'undefined' && overwolf.io) {
        // Clear Overwolf storage
        await this.deleteOverwolfFile(`${this.storageKey}.json`);
        await this.deleteOverwolfFile(`${this.storageKey}_settings.json`);
      } else {
        // Clear localStorage
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(`${this.storageKey}_settings`);
      }

      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  async deleteOverwolfFile(filename) {
    return new Promise((resolve) => {
      overwolf.io.delete(
        `${overwolf.io.enums.StorageSpace.appData}/${filename}`,
        (result) => {
          resolve(); // Don't reject on error as file might not exist
        }
      );
    });
  }
}