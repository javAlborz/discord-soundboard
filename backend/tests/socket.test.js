const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.io functionality', () => {
  let io, serverSocket, clientSocket, httpServer;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  it('should establish connection', () => {
    expect(serverSocket).toBeDefined();
    expect(clientSocket.connected).toBe(true);
  });

  it('should handle bot_status event', (done) => {
    const testStatus = {
      connected: true,
      guilds: ['123456789'],
      voice_connections: { '123456789': 'connected' }
    };

    clientSocket.on('bot_status', (status) => {
      expect(status).toEqual(testStatus);
      done();
    });

    serverSocket.emit('bot_status', testStatus);
  });

  it('should handle join_voice event', (done) => {
    const testData = { guild_id: '123456789', channel_id: '987654321' };

    serverSocket.on('join_voice', (data) => {
      expect(data).toEqual(testData);
      done();
    });

    clientSocket.emit('join_voice', testData);
  });

  it('should handle leave_voice event', (done) => {
    const testData = { guild_id: '123456789' };

    serverSocket.on('leave_voice', (data) => {
      expect(data).toEqual(testData);
      done();
    });

    clientSocket.emit('leave_voice', testData);
  });

  it('should handle play_sound event', (done) => {
    const testData = { sound: 'test-sound', guild_id: '123456789' };

    serverSocket.on('play_sound', (data) => {
      expect(data).toEqual(testData);
      done();
    });

    clientSocket.emit('play_sound', testData);
  });

  it('should broadcast sound_added event', (done) => {
    const soundInfo = {
      name: 'new-sound',
      filename: 'new-sound.mp3',
      path: '/sounds/new-sound.mp3',
      size: 1024
    };

    clientSocket.on('sound_added', (data) => {
      expect(data).toEqual(soundInfo);
      done();
    });

    io.emit('sound_added', soundInfo);
  });

  it('should broadcast sound_deleted event', (done) => {
    const filename = 'deleted-sound.mp3';

    clientSocket.on('sound_deleted', (data) => {
      expect(data).toBe(filename);
      done();
    });

    io.emit('sound_deleted', filename);
  });

  it('should broadcast bot_command event', (done) => {
    const command = { command: 'play', sound: 'test-sound', guild_id: '123456789' };

    clientSocket.on('bot_command', (data) => {
      expect(data).toEqual(command);
      done();
    });

    io.emit('bot_command', command);
  });
});