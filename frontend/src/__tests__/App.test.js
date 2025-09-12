import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockEmit = jest.fn();
  const mockOn = jest.fn((event, callback) => {
    // Simulate immediate connection
    if (event === 'connect') {
      setTimeout(callback, 0);
    }
  });
  const mockClose = jest.fn();
  
  return jest.fn(() => ({
    emit: mockEmit,
    on: mockOn,
    close: mockClose,
    connected: true
  }));
});

// Mock fetch
global.fetch = jest.fn();

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful sounds API response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders main title', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Discord Soundboard')).toBeInTheDocument();
    });
  });

  it('renders subtitle', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Control your Discord bot\'s sound effects from the web')).toBeInTheDocument();
    });
  });

  it('renders bot status component', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Bot Status')).toBeInTheDocument();
    });
  });

  it('renders upload section', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Upload Sounds')).toBeInTheDocument();
    });
  });

  it('renders sound effects section', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    });
  });

  it('fetches sounds on mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/sounds');
    });
  });

  it('displays loading state initially', () => {
    // Mock a delayed response to test loading state
    fetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<App />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no sounds are available', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('No sounds uploaded yet')).toBeInTheDocument();
    });
  });
});