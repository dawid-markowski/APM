import React, { useRef, useEffect } from "react";

function AudioPlayer({
  src,
  audioContext,
  analyserNodeToConnect,
  onAudioReady,
  onTimeUpdate,
  onLoadedMetadata,
  gainValue = 1,
  filterType = null,
  filterFreq = 20000,
}) {
  const audioRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filterNodeRef = useRef(null);
  const isGraphConnectedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio && audioContext && src) {
      if (!sourceRef.current || sourceRef.current.mediaElement !== audio) {
        // Odłączenie starego źródła
        sourceRef.current?.disconnect();

        // Tworzenie nowego źródła
        try {
          sourceRef.current = audioContext.createMediaElementSource(audio);
        } catch (e) {
          isGraphConnectedRef.current = false;
          return;
        }
      }

      const source = sourceRef.current;

      // Ustawianie głośności
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
      }
      const gainNode = gainNodeRef.current;

      if (gainNode.gain.value !== gainValue) {
        try {
          gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);
        } catch (e) {}
      }

      let currentOutputNode = source;

      if (isGraphConnectedRef.current) {
        try {
          source.disconnect();
          if (filterNodeRef.current) filterNodeRef.current.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      }

      currentOutputNode.connect(gainNode);
      currentOutputNode = gainNode;

      // Ustawianie filtrów
      if (filterType && filterType !== "none") {
        if (
          !filterNodeRef.current ||
          filterNodeRef.current.type !== filterType
        ) {
          if (filterNodeRef.current) filterNodeRef.current.disconnect();
          filterNodeRef.current = audioContext.createBiquadFilter();
          filterNodeRef.current.type = filterType;
        }
        // Częstotliwość filtra
        const filterNode = filterNodeRef.current;
        if (filterNode.frequency.value !== filterFreq) {
          try {
            filterNode.frequency.setValueAtTime(
              filterFreq,
              audioContext.currentTime
            );
          } catch (e) {}
        }
        currentOutputNode.connect(filterNode);
        currentOutputNode = filterNode;
      } else if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
        filterNodeRef.current = null;
      }

      // Podłączenie analizatora
      if (analyserNodeToConnect) {
        currentOutputNode.connect(analyserNodeToConnect);
      }

      // Podłączenie dźwięku
      currentOutputNode.connect(audioContext.destination);
      isGraphConnectedRef.current = true;

      // Event Listeners
      // Reakcja na zmianę czasu odtwarzania
      const handleTimeUpdateEvent = () =>
        onTimeUpdate && onTimeUpdate(audio.currentTime, audio.duration);

      // Reakcja na załadowanie danych audio
      const handleLoadedMetadataEvent = () => {
        if (onLoadedMetadata) onLoadedMetadata(audio.duration);
        if (
          audioContext.state === "running" &&
          typeof onAudioReady === "function"
        ) {
          onAudioReady();
        }
      };

      const handlePlayEvent = () => {
        if (audioContext.state === "suspended") {
          audioContext.resume().then(() => {
            if (
              typeof onAudioReady === "function" &&
              audioContext.state === "running"
            ) {
              onAudioReady();
            }
          });
        } else if (
          audioContext.state === "running" &&
          typeof onAudioReady === "function"
        ) {
          onAudioReady();
        }
      };

      audio.addEventListener("timeupdate", handleTimeUpdateEvent);
      audio.addEventListener("loadedmetadata", handleLoadedMetadataEvent);
      audio.addEventListener("play", handlePlayEvent);

      if (
        audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        audioContext.state === "running" &&
        typeof onAudioReady === "function"
      ) {
        onAudioReady();
      }

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdateEvent);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadataEvent);
        audio.removeEventListener("play", handlePlayEvent);

        if (isGraphConnectedRef.current) {
          sourceRef.current?.disconnect();
          gainNodeRef.current?.disconnect();
          filterNodeRef.current?.disconnect();
          isGraphConnectedRef.current = false;
        }
      };
    }
  }, [
    src,
    audioContext,
    analyserNodeToConnect,
    onAudioReady,
    onTimeUpdate,
    onLoadedMetadata,
    gainValue,
    filterType,
    filterFreq,
  ]);

  // Przy zmianie źródła audio
  useEffect(() => {
    if (audioRef.current) {
      if (src) {
        audioRef.current.src = src;
        audioRef.current.load();
      } else {
        audioRef.current.src = "";
        audioRef.current.load();
      }
      isGraphConnectedRef.current = false;
    }
  }, [src]);

  if (!src) return <p>Brak źródła audio do odtworzenia.</p>;

  return <audio ref={audioRef} controls style={{ width: "100%" }} />;
}

export default AudioPlayer;
