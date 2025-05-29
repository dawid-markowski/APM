import React, { useRef, useEffect } from 'react';

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

    // console.log('AudioPlayer: useEffect triggered. Src:', src, 'AudioContext available:', !!audioContext, 'Analyser available:', !!analyserNodeToConnect);

    if (audio && audioContext && src) {
      // console.log('AudioPlayer: Inside main logic. Passed AudioContext state:', audioContext.state, 'for src:', src);

      if (!sourceRef.current || sourceRef.current.mediaElement !== audio) {
        if (sourceRef.current) {
          try { sourceRef.current.disconnect(); } catch (e) { /* console.warn("AudioPlayer: Error disconnecting old source", e); */ }
        }
        try {
          sourceRef.current = audioContext.createMediaElementSource(audio);
          // console.log('AudioPlayer: MediaElementSourceNode CREATED successfully for src:', src, sourceRef.current);
        } catch (e) {
          console.error("AudioPlayer: FATAL Error creating media element source. Src:", src, "Error:", e);
          isGraphConnectedRef.current = false;
          return;
        }
      }
      const source = sourceRef.current;

      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
      }
      const gainNode = gainNodeRef.current;

      if (gainNode.gain.value !== gainValue) {
        try { gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime); } catch (e) { /* console.warn("AudioPlayer: Error setting gain value...", e); */ }
      }

      let currentOutputNode = source;

      if (isGraphConnectedRef.current) {
        try {
          source.disconnect();
          if (filterNodeRef.current) filterNodeRef.current.disconnect();
          gainNode.disconnect();
        } catch (e) { /* console.warn("AudioPlayer: Harmless error during pre-reconnect disconnections...", e); */ }
      }
      
      currentOutputNode.connect(gainNode);
      currentOutputNode = gainNode;

      if (filterType && filterType !== 'none') {
        if (!filterNodeRef.current || filterNodeRef.current.type !== filterType) {
          if (filterNodeRef.current) filterNodeRef.current.disconnect();
          filterNodeRef.current = audioContext.createBiquadFilter();
          filterNodeRef.current.type = filterType;
        }
        const filterNode = filterNodeRef.current;
        if (filterNode.frequency.value !== filterFreq) {
          try { filterNode.frequency.setValueAtTime(filterFreq, audioContext.currentTime); } catch (e) { /* console.warn("AudioPlayer: Error setting filter frequency...", e); */ }
        }
        currentOutputNode.connect(filterNode);
        currentOutputNode = filterNode;
      } else if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
        filterNodeRef.current = null;
      }

      if (analyserNodeToConnect) {
        currentOutputNode.connect(analyserNodeToConnect);
      }

      currentOutputNode.connect(audioContext.destination);
      isGraphConnectedRef.current = true;
      // console.log('AudioPlayer: Audio graph connected. Context state:', audioContext.state);

      // --- Event Listeners ---
      const handleTimeUpdateEvent = () => onTimeUpdate && onTimeUpdate(audio.currentTime, audio.duration);
      
      const handleLoadedMetadataEvent = () => {
        // console.log('AudioPlayer: metadata loaded. Audio duration:', audio.duration, 'AudioContext state:', audioContext.state);
        if (onLoadedMetadata) onLoadedMetadata(audio.duration);
        // Sprawdź, czy kontekst jest aktywny, zanim wywołasz onAudioReady
        if (audioContext.state === 'running' && typeof onAudioReady === 'function') {
          // console.log('AudioPlayer: Context running (on metadata), calling onAudioReady.');
          onAudioReady();
        }
      };

      const handlePlayEvent = () => {
        console.log('AudioPlayer: "play" event on <audio> element. AudioContext state:', audioContext.state);
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('AudioPlayer: AudioContext RESUMED on "play" event. New state:', audioContext.state);
            if (typeof onAudioReady === 'function' && audioContext.state === 'running') {
              // Po wznowieniu kontekstu i jeśli onAudioReady jest zdefiniowane, wywołaj je
              // aby upewnić się, że ProcessingZone wie, że może zacząć rysować widmo.
              onAudioReady();
            }
          }).catch(e => console.error('AudioPlayer: Error resuming context on "play" event:', e));
        } else if (audioContext.state === 'running' && typeof onAudioReady === 'function') {
          // Jeśli kontekst już działa, po prostu upewnij się, że onAudioReady jest wywołane
          // console.log('AudioPlayer: Context already running (on play), calling onAudioReady.');
          onAudioReady();
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdateEvent);
      audio.addEventListener('loadedmetadata', handleLoadedMetadataEvent);
      audio.addEventListener('play', handlePlayEvent); // <-- DODANY EVENT LISTENER
      
      // Jeśli audio jest już gotowe do odtwarzania (np. po zmianie src i auto-load)
      // i kontekst już działa, wywołaj onAudioReady
      if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && audioContext.state === 'running' && typeof onAudioReady === 'function') {
        // console.log('AudioPlayer: Initial check - context running & enough data, calling onAudioReady.');
        onAudioReady();
      }

      return () => {
        // console.log('AudioPlayer: Cleanup function for src:', src, 'Disconnecting graph nodes.');
        audio.removeEventListener('timeupdate', handleTimeUpdateEvent);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadataEvent);
        audio.removeEventListener('play', handlePlayEvent); // <-- Usuń listener
        if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch (e) { /* ignore */ } }
        if (gainNodeRef.current) { try { gainNodeRef.current.disconnect(); } catch (e) { /* ignore */ } }
        if (filterNodeRef.current) { try { filterNodeRef.current.disconnect(); } catch (e) { /* ignore */ } }
        isGraphConnectedRef.current = false;
        // console.log('AudioPlayer: Graph disconnected in cleanup.');
      };
    } else {
      // console.log('AudioPlayer: useEffect skipped - missing audio, audioContext, or src.');
      if (isGraphConnectedRef.current) {
        if (sourceRef.current) try { sourceRef.current.disconnect(); } catch(e) {}
        if (gainNodeRef.current) try { gainNodeRef.current.disconnect(); } catch(e) {}
        if (filterNodeRef.current) try { filterNodeRef.current.disconnect(); } catch(e) {}
        isGraphConnectedRef.current = false;
      }
    }
  }, [
    src, audioContext, analyserNodeToConnect, onAudioReady,
    onTimeUpdate, onLoadedMetadata, gainValue, filterType, filterFreq,
  ]);

  useEffect(() => {
    if (audioRef.current) {
      // console.log('AudioPlayer: src prop changed to:', src, '. Updating <audio> element src.');
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

  return <audio ref={audioRef} controls style={{ width: '100%' }} />;
}

export default AudioPlayer;