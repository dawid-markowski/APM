import React from 'react';

function GalleryZone({ audioFiles, selectedAudio, onSelectAudio, onRemoveAudio }) {
  if (audioFiles.length === 0) {
    return (
      <div className="zone">
        <h2>2. Prezentacja - Galeria Nagrań</h2>
        <p>Brak nagrań w galerii. Dodaj pliki w strefie akwizycji.</p>
      </div>
    );
  }

  return (
    <div className="zone">
      <h2>2. Prezentacja - Galeria Nagrań</h2>
      {audioFiles.map((file) => (
        <div
          key={file.id}
          className={`gallery-item ${selectedAudio && selectedAudio.id === file.id ? 'selected' : ''}`}
          onClick={() => onSelectAudio(file)}
        >
          <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); // Zapobiega selekcji przy usuwaniu
              onRemoveAudio(file.id); 
            }}
            style={{backgroundColor: '#dc3545'}}
          >
            Usuń
          </button>
        </div>
      ))}
    </div>
  );
}

export default GalleryZone;