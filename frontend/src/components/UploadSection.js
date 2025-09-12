import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const UploadSection = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (files) => {
    const file = files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('sound', file);

    try {
      const response = await fetch(`${API_URL}/api/sounds/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="bg-discord-darker rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Sounds</h2>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-discord-blurple bg-discord-blurple/10'
            : 'border-discord-light hover:border-discord-blurple'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="text-discord-light">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-discord-blurple mx-auto mb-2"></div>
            Uploading...
          </div>
        ) : (
          <>
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-discord-light mb-4">
              Drag and drop audio files here or click to browse
            </p>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-discord-blurple hover:bg-discord-blurple/80 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors inline-block"
            >
              Browse Files
            </label>
            <p className="text-xs text-discord-light mt-2">
              Supported formats: MP3, WAV, OGG, M4A (Max 10MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadSection;