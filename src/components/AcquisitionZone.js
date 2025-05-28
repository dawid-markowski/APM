import React, { useState, useRef } from 'react';

function AcquisitionZone({ onFileAdd }) {
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState('');

  const handleFileChange = (event) => {
    setPermissionError(null); // Wyczyść błędy od mikrofonu
    setRecordingStatus('');
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('audio/')) {
        const fileWithUrl = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          originalFile: file
        };
        onFileAdd(fileWithUrl);
      } else {
        alert(`Plik "${file.name}" nie jest plikiem audio i został zignorowany.`);
      }
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    setPermissionError(null);
    setRecordingStatus('Prośba o dostęp do mikrofonu...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStatus('Dostęp przyznany. Rozpoczynanie nagrywania...');
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setRecordingStatus('Nagrywanie zakończone. Przetwarzanie...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' }); // Możesz zmienić typ, np. audio/ogg
        const fileName = `nagranie-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
        
        const recordedFileObject = {
          id: Date.now() + Math.random(),
          name: fileName,
          type: audioBlob.type,
          size: audioBlob.size,
          url: URL.createObjectURL(audioBlob),
          originalFile: new File([audioBlob], fileName, { type: audioBlob.type }) // Tworzymy obiekt File
        };
        onFileAdd(recordedFileObject);
        audioChunksRef.current = []; // Resetuj chunki
        setRecordingStatus(`Nagranie "${fileName}" dodane do galerii.`);

        // Zatrzymywanie ścieżek mikrofonu po zakończeniu nagrywania
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingStatus('Nagrywanie w toku...');
    } catch (err) {
      console.error("Błąd dostępu do mikrofonu:", err);
      setPermissionError("Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.");
      setRecordingStatus('');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      // Stream jest zatrzymywany w onstop
    }
    setIsRecording(false);
    // status zostanie zaktualizowany w onstop
  };

  return (
    <div className="zone">
      <h2>1. Akwizycja Materiału</h2>
      <div>
        <h3>Pobierz z urządzenia:</h3>
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          disabled={isRecording} // Wyłącz, gdy nagrywa
        />
        <p>Wybierz jeden lub więcej plików audio ze swojego urządzenia.</p>
      </div>
      <hr style={{ margin: '20px 0' }} />
      <div>
        <h3>Nagraj z mikrofonu:</h3>
        {!isRecording ? (
          <button onClick={startRecording} disabled={isRecording}>
            Rozpocznij Nagrywanie
          </button>
        ) : (
          <button onClick={stopRecording} disabled={!isRecording} style={{backgroundColor: '#dc3545'}}>
            Zatrzymaj Nagrywanie
          </button>
        )}
        {permissionError && <p style={{ color: 'red' }}>Błąd: {permissionError}</p>}
        {recordingStatus && <p style={{ color: 'blue' }}>Status: {recordingStatus}</p>}
      </div>
    </div>
  );
}

export default AcquisitionZone;