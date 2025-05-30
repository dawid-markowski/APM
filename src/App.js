import React, { useState, useEffect } from "react";
import "./App.css";
import AcquisitionZone from "./components/AcquisitionZone";
import GalleryZone from "./components/GalleryZone";
import ProcessingZone from "./components/ProcessingZone";

function App() {
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);

  useEffect(() => {
    return () => {
      // Czyści URLe przy odmontowaniu
      audioFiles.forEach((file) => {
        if (file.url && file.url.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, []);

  const handleAddAudioFile = (newFile) => {
    // Dodawanie pliku jeśli jeszcze nie ma
    if (
      !audioFiles.some(
        (f) => f.name === newFile.name && f.size === newFile.size
      )
    ) {
      setAudioFiles((prevFiles) => [...prevFiles, newFile]);
    } else {
      alert(`Plik "${newFile.name}" już znajduje się w galerii.`);
      URL.revokeObjectURL(newFile.url); // Zwolnienie nieużywanego URLa
    }
  };

  const handleRemoveAudioFile = (fileIdToRemove) => {
    // Usunięcie pliku i jego URLa
    const fileToRemove = audioFiles.find((f) => f.id === fileIdToRemove);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    setAudioFiles((prevFiles) =>
      prevFiles.filter((file) => file.id !== fileIdToRemove)
    );
    if (selectedAudio && selectedAudio.id === fileIdToRemove) {
      setSelectedAudio(null); // Odznaczenie jeśli usunięto zaznaczony plik
    }
  };

  const handleSelectAudio = (audioFile) => {
    // Zaznaczenie pliku
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
