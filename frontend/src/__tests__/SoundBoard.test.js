import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SoundBoard from '../components/SoundBoard';

// Mock window.confirm
global.confirm = jest.fn();

// Mock Audio constructor
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn()
}));

describe('SoundBoard Component', () => {
  const mockSounds = [
    {
      name: 'test-sound-1',
      filename: 'test-sound-1.mp3',
      path: '/sounds/test-sound-1.mp3',
      size: 1024
    },
    {
      name: 'test-sound-2',
      filename: 'test-sound-2.wav',
      path: '/sounds/test-sound-2.wav',
      size: 2048
    }
  ];

  const mockOnPlaySound = jest.fn();
  const mockOnDeleteSound = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sound effects title', () => {
    render(<SoundBoard sounds={[]} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
  });

  it('displays sound count', () => {
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    expect(screen.getByText('2 of 2 sounds')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    expect(screen.getByPlaceholderText('Search sounds...')).toBeInTheDocument();
  });

  it('displays empty state when no sounds', () => {
    render(<SoundBoard sounds={[]} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    expect(screen.getByText('No sounds uploaded yet')).toBeInTheDocument();
    expect(screen.getByText('Upload your first sound file to get started!')).toBeInTheDocument();
  });

  it('renders sound cards', () => {
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    expect(screen.getByText('test-sound-1')).toBeInTheDocument();
    expect(screen.getByText('test-sound-2')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument(); // File size formatting
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });

  it('filters sounds based on search input', async () => {
    const user = userEvent.setup();
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    const searchInput = screen.getByPlaceholderText('Search sounds...');
    await user.type(searchInput, 'test-sound-1');
    
    expect(screen.getByText('test-sound-1')).toBeInTheDocument();
    expect(screen.queryByText('test-sound-2')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 sounds')).toBeInTheDocument();
  });

  it('shows no results message when search yields no matches', async () => {
    const user = userEvent.setup();
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    const searchInput = screen.getByPlaceholderText('Search sounds...');
    await user.type(searchInput, 'nonexistent');
    
    expect(screen.getByText('No sounds found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search filter')).toBeInTheDocument();
  });

  it('calls onPlaySound when play button is clicked', async () => {
    const user = userEvent.setup();
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    const playButtons = screen.getAllByText('▶️ Play');
    await user.click(playButtons[0]);
    
    expect(mockOnPlaySound).toHaveBeenCalledWith('test-sound-1');
  });

  it('plays audio locally when preview button is clicked', async () => {
    const user = userEvent.setup();
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    const previewButtons = screen.getAllByText('🎧');
    await user.click(previewButtons[0]);
    
    expect(Audio).toHaveBeenCalledWith('http://localhost:3001/sounds/test-sound-1.mp3');
  });

  it('shows delete confirmation and calls onDeleteSound', async () => {
    const user = userEvent.setup();
    global.confirm.mockReturnValue(true);
    
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    // Delete buttons are only visible on hover, so we need to hover first
    const soundCard = screen.getByText('test-sound-1').closest('div').closest('div');
    await user.hover(soundCard);
    
    const deleteButton = screen.getAllByText('🗑️')[0];
    await user.click(deleteButton);
    
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete "test-sound-1"?');
    expect(mockOnDeleteSound).toHaveBeenCalledWith('test-sound-1.mp3');
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    global.confirm.mockReturnValue(false);
    
    render(<SoundBoard sounds={mockSounds} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    const soundCard = screen.getByText('test-sound-1').closest('div').closest('div');
    await user.hover(soundCard);
    
    const deleteButton = screen.getAllByText('🗑️')[0];
    await user.click(deleteButton);
    
    expect(global.confirm).toHaveBeenCalled();
    expect(mockOnDeleteSound).not.toHaveBeenCalled();
  });

  it('formats file sizes correctly', () => {
    const soundsWithDifferentSizes = [
      { name: 'small', filename: 'small.mp3', path: '/sounds/small.mp3', size: 512 },
      { name: 'medium', filename: 'medium.mp3', path: '/sounds/medium.mp3', size: 1024 * 1024 },
      { name: 'large', filename: 'large.mp3', path: '/sounds/large.mp3', size: 1024 * 1024 * 1024 }
    ];
    
    render(<SoundBoard sounds={soundsWithDifferentSizes} onPlaySound={mockOnPlaySound} onDeleteSound={mockOnDeleteSound} />);
    
    expect(screen.getByText('512 Bytes')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText('1 GB')).toBeInTheDocument();
  });
});