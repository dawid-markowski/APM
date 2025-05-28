import React, { useState, useEffect } from 'react';
import './App.css';
import AcquisitionZone from './components/AcquisitionZone';
import GalleryZone from './components/GalleryZone';
import ProcessingZone from './components/ProcessingZone';

function App() {
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);

  useEffect(() => {
  // Ten efekt (i jego funkcja czyszcząca) uruchomi się tylko raz:
  // - konfiguracja efektu przy pierwszym montażu komponentu App
  // - funkcja czyszcząca przy odmontowywaniu komponentu App

  return () => {
    // Ta funkcja zostanie wywołana TYLKO wtedy, gdy komponent App zostanie odmontowany.
    // 'audioFiles' w tym miejscu odnosi się do stanu `audioFiles`
    // w momencie ostatniego renderowania komponentu, co jest poprawne dla czyszczenia przy odmontowaniu.
    audioFiles.forEach(file => {
      if (file.url && file.url.startsWith('blob:')) { // Dobra praktyka, aby sprawdzić, czy to Blob URL
        URL.revokeObjectURL(file.url);
      }
    });
    console.log('App unmounted, all remaining Blob URLs revoked.'); // Możesz dodać log do testowania
  };
}, []); // PUSTA tablica zależności - to jest kluczowa zmiana!

  const handleAddAudioFile = (newFile) => {
    // Sprawdzenie czy plik (po nazwie i rozmiarze) już nie istnieje
    if (!audioFiles.some(f => f.name === newFile.name && f.size === newFile.size)) {
        setAudioFiles(prevFiles => [...prevFiles, newFile]);
    } else {
        alert(`Plik "${newFile.name}" już znajduje się w galerii.`);
        URL.revokeObjectURL(newFile.url); // Zwolnij nieużywany URL
    }
  };

  const handleRemoveAudioFile = (fileIdToRemove) => {
    const fileToRemove = audioFiles.find(f => f.id === fileIdToRemove);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.url); // Zwolnij Object URL
    }
    setAudioFiles(prevFiles => prevFiles.filter(file => file.id !== fileIdToRemove));
    if (selectedAudio && selectedAudio.id === fileIdToRemove) {
      setSelectedAudio(null); // Odznacz, jeśli usunięto zaznaczony plik
    }
  };

  const handleSelectAudio = (audioFile) => {
    setSelectedAudio(audioFile);
  };


  return (
    <div className="app-container">
      <h1>Aplikacja Multimedialna - Nagrania Dźwiękowe 🎤🎧</h1>
      
      <AcquisitionZone onFileAdd={handleAddAudioFile} />
      
      <GalleryZone 
        audioFiles={audioFiles} 
        selectedAudio={selectedAudio}
        onSelectAudio={handleSelectAudio}
        onRemoveAudio={handleRemoveAudioFile}
      />
      
      <ProcessingZone selectedAudio={selectedAudio} />

    </div>
  );
}

export default App;