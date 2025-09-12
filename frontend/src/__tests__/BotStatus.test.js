import React from 'react';
import { render, screen } from '@testing-library/react';
import BotStatus from '../components/BotStatus';

describe('BotStatus Component', () => {
  it('renders bot status title', () => {
    const mockStatus = { connected: false };
    render(<BotStatus status={mockStatus} />);
    
    expect(screen.getByText('Bot Status')).toBeInTheDocument();
  });

  it('displays disconnected status', () => {
    const mockStatus = { connected: false };
    render(<BotStatus status={mockStatus} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Discord bot is not connected. Please check your bot configuration and ensure it\'s running.')).toBeInTheDocument();
  });

  it('displays connected status', () => {
    const mockStatus = { 
      connected: true,
      guilds: ['123', '456'],
      voice_connections: { '123': 'connected' }
    };
    render(<BotStatus status={mockStatus} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of servers
    expect(screen.getByText('1')).toBeInTheDocument(); // Number of voice connections
  });

  it('displays server and voice channel counts when connected', () => {
    const mockStatus = { 
      connected: true,
      guilds: ['123', '456', '789'],
      voice_connections: { '123': 'connected', '456': 'connected' }
    };
    render(<BotStatus status={mockStatus} />);
    
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Voice Channels')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Number of servers
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of voice connections
  });

  it('handles missing guilds and voice_connections properties', () => {
    const mockStatus = { connected: true };
    render(<BotStatus status={mockStatus} />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2); // Both servers and voice channels should show 0
  });

  it('does not show server and voice channel info when disconnected', () => {
    const mockStatus = { connected: false };
    render(<BotStatus status={mockStatus} />);
    
    expect(screen.queryByText('Servers')).not.toBeInTheDocument();
    expect(screen.queryByText('Voice Channels')).not.toBeInTheDocument();
  });
});