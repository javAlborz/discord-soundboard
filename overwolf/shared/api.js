class ApiClient {
  constructor() {
    this.baseUrl = 'http://localhost:3051';
    this.connected = false;
    this.testConnection();
  }

  async testConnection() {
    try {
      await this.get('/api/status');
      this.connected = true;
      console.log('Backend connection established');
    } catch (error) {
      this.connected = false;
      console.warn('Backend connection failed:', error);
    }
  }

  isConnected() {
    return this.connected;
  }

  async get(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async put(endpoint, data) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Hotkey-specific API methods
  async getHotkeys() {
    return await this.get('/api/hotkeys');
  }

  async createHotkey(hotkeyData) {
    return await this.post('/api/hotkeys', hotkeyData);
  }

  async updateHotkey(id, hotkeyData) {
    return await this.put(`/api/hotkeys/${id}`, hotkeyData);
  }

  async deleteHotkey(id) {
    return await this.delete(`/api/hotkeys/${id}`);
  }

  async validateHotkey(hotkeyData) {
    return await this.post('/api/hotkeys/validate', hotkeyData);
  }

  async getConflicts() {
    return await this.get('/api/hotkeys/conflicts');
  }

  // Sound API methods
  async getSounds() {
    return await this.get('/api/sounds');
  }

  async playSound(soundFile, guildId = null, triggeredBy = 'hotkey') {
    return await this.post('/api/play', {
      sound: soundFile,
      guild_id: guildId,
      triggered_by: triggeredBy
    });
  }

  async getStatus() {
    return await this.get('/api/status');
  }
}