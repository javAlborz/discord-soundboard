const fs = require('fs');
const path = require('path');

// Create test sounds directory
const testSoundsDir = path.join(__dirname, '..', 'test-sounds');
if (!fs.existsSync(testSoundsDir)) {
  fs.mkdirSync(testSoundsDir, { recursive: true });
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.SOUNDS_DIR = './test-sounds';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Global test cleanup
afterAll(async () => {
  // Cleanup test sounds directory
  if (fs.existsSync(testSoundsDir)) {
    fs.rmSync(testSoundsDir, { recursive: true, force: true });
  }
});