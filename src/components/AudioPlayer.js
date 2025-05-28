import React, { useRef, useEffect } from 'react';

function AudioPlayer({ src, onTimeUpdate, onLoadedMetadata, gainValue = 1, filterType = null, filterFreq = 20000 }) {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filterNodeRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      // Inicjalizacja Web Audio API
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      if (!sourceRef.current) {
        sourceRef.current = audioContext.createMediaElementSource(audio);
      }
      const source = sourceRef.current;

      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
      }
      const gainNode = gainNodeRef.current;

      // Usuwamy stary filtr jeśli istnieje
      if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
      }
      
      let currentNode = source; // Zaczynamy od źródła

      // Podłączanie GainNode
      gainNode.gain.value = gainValue;
      currentNode.disconnect(); // Odłączamy poprzednie połączenie źródła
      currentNode.connect(gainNode);
      currentNode = gainNode; // GainNode jest teraz bieżącym węzłem

      // Podłączanie BiquadFilterNode (jeśli aktywny)
      if (filterType && filterType !== 'none') {
        filterNodeRef.current = audioContext.createBiquadFilter();
        const filterNode = filterNodeRef.current;
        filterNode.type = filterType;
        filterNode.frequency.setValueAtTime(filterFreq, audioContext.currentTime);
        // filterNode.Q.setValueAtTime(1, audioContext.currentTime); // Domyślna wartość Q
        
        currentNode.disconnect(); // Odłączamy poprzednie połączenie (np. z gainNode)
        currentNode.connect(filterNode);
        currentNode = filterNode; // FilterNode jest teraz bieżącym węzłem
      }
      
      // Podłączanie do wyjścia
      currentNode.connect(audioContext.destination);


      const handleTimeUpdate = () => {
        if (onTimeUpdate) {
          onTimeUpdate(audio.currentTime, audio.duration);
        }
      };

      const handleLoadedMetadata = () => {
        if (onLoadedMetadata) {
          onLoadedMetadata(audio.duration);
        }
         // Autoodtwarzanie może wymagać interakcji użytkownika w niektórych przeglądarkach
        // audio.play().catch(e => console.warn("Autoplay blocked:", e));
      };
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        // Nie zamykamy audioContext tutaj, aby umożliwić zmianę pliku bez resetu
        // source.disconnect(); // Odłączamy tylko source
        // if (gainNodeRef.current) gainNodeRef.current.disconnect();
        // if (filterNodeRef.current) filterNodeRef.current.disconnect();
      };
    }
  }, [src, onTimeUpdate, onLoadedMetadata, gainValue, filterType, filterFreq]); // Re-run effect if src, gainValue, or filter changes

  // Zmiana źródła audio
  useEffect(() => {
    if (audioRef.current && src) {
      audioRef.current.src = src;
      // audioRef.current.load(); // Wymuszenie załadowania nowego src
      // audioRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
    } else if (audioRef.current) {
      audioRef.current.src = ""; // Czyścimy src, jeśli nie ma wybranego pliku
    }
  }, [src]);


  if (!src) return <p>Wybierz plik audio do odtworzenia.</p>;

  return (
    <audio ref={audioRef} controls style={{ width: '100%' }} />
  );
}

export default AudioPlayer;