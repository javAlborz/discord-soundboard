import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadSection from '../components/UploadSection';

// Mock fetch
global.fetch = jest.fn();

// Mock alert
global.alert = jest.fn();

describe('UploadSection Component', () => {
  const mockOnUploadComplete = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    global.alert.mockClear();
    mockOnUploadComplete.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders upload sounds title', () => {
    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);
    
    expect(screen.getByText('Upload Sounds')).toBeInTheDocument();
  });

  it('renders upload area with instructions', () => {
    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);
    
    expect(screen.getByText('Drag and drop audio files here or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: MP3, WAV, OGG, M4A (Max 10MB)')).toBeInTheDocument();
  });

  it('handles successful file upload', async () => {
    const user = userEvent.setup();
    
    // Mock successful upload response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        sound: {
          name: 'test-sound',
          filename: 'test-sound.mp3',
          path: '/sounds/test-sound.mp3',
          size: 1024
        }
      })
    });

    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    // Create a mock audio file
    const file = new File(['audio content'], 'test-sound.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText('Browse Files'); // Get the file input by its label

    await user.upload(input, file);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/sounds/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled();
    });
  });

  it('shows error for non-audio files', async () => {
    const user = userEvent.setup();
    
    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    // Create a mock non-audio file
    const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Browse Files');

    await user.upload(input, file);

    expect(global.alert).toHaveBeenCalledWith('Please select an audio file');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error for files over 10MB', async () => {
    const user = userEvent.setup();
    
    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    // Create a mock large file (over 10MB)
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large-audio.mp3', { type: 'audio/mpeg' });
    
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    
    const input = screen.getByLabelText('Browse Files');

    await user.upload(input, file);

    expect(global.alert).toHaveBeenCalledWith('File size must be less than 10MB');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles upload failure', async () => {
    const user = userEvent.setup();
    
    // Mock failed upload response
    fetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    const file = new File(['audio content'], 'test-sound.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText('Browse Files');

    await user.upload(input, file);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to upload file');
    });

    expect(mockOnUploadComplete).not.toHaveBeenCalled();
  });

  it('shows uploading state during upload', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    let resolvePromise;
    const uploadPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    fetch.mockReturnValue(uploadPromise);

    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    const file = new File(['audio content'], 'test-sound.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText('Browse Files');

    await user.upload(input, file);

    // Should show uploading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument();

    // Resolve the promise
    resolvePromise({
      ok: true,
      json: async () => ({ success: true, sound: {} })
    });

    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    });
  });

  it('handles drag and drop events', () => {
    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    const dropArea = screen.getByText('Drag and drop audio files here or click to browse').closest('div');

    // Test drag over
    fireEvent.dragOver(dropArea);
    expect(dropArea).toHaveClass('border-discord-blurple');

    // Test drag leave
    fireEvent.dragLeave(dropArea);
    expect(dropArea).not.toHaveClass('border-discord-blurple');
  });

  it('handles file drop', async () => {
    // Mock successful upload response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        sound: { name: 'dropped-sound', filename: 'dropped-sound.mp3' }
      })
    });

    render(<UploadSection onUploadComplete={mockOnUploadComplete} />);

    const dropArea = screen.getByText('Drag and drop audio files here or click to browse').closest('div');
    const file = new File(['audio content'], 'dropped-sound.mp3', { type: 'audio/mpeg' });

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});