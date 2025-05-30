import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioPlayer from './AudioPlayer';

function ProcessingZone({ selectedAudio }) {
  const [gain, setGain] = useState(1);
  const [filterType, setFilterType] = useState('none');
  const [filterFrequency, setFilterFrequency] = useState(350);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  // Inicjalizacja AudioContext i AnalyserNode
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log('ProcessingZone: AudioContext CREATED, initial state:', audioContextRef.current.state);
      } catch (e) {
        console.error("ProcessingZone: Failed to create AudioContext.", e);
        alert("Nie można zainicjalizować Web Audio API w tej przeglądarce.");
        return;
      }
    }

    if (audioContextRef.current && !analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      console.log('ProcessingZone: AnalyserNode CREATED.');
    }

    const localAudioCtx = audioContextRef.current; // Dla funkcji czyszczącej
    return () => {
      console.log('ProcessingZone: Unmounting. AnimationFrameId:', animationFrameIdRef.current);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      // if (localAudioCtx && localAudioCtx.state !== 'closed') {
      //   localAudioCtx.close().catch(e => console.warn("ProcessingZone: Error closing context on unmount:", e));
      // }
    };
  }, []); // Pusta tablica, aby uruchomić tylko raz przy montażu

  const drawSpectrum = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current || !audioContextRef.current) {
      if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      return;
    }
    
    if (audioContextRef.current.state !== 'running') {
      // console.log('drawSpectrum: AudioContext not running (state:', audioContextRef.current.state, '). Requesting next frame.');
      // Pętla będzie kontynuowana, ale rysowanie efektywnie czeka, aż kontekst będzie 'running'
      animationFrameIdRef.current = requestAnimationFrame(drawSpectrum);
      return;
    }

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = 'rgb(40, 44, 52)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];
      const r = barHeight + 25 * (i / bufferLength);
      const g = 250 * (i / bufferLength);
      const b = 50;
      ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${b})`;
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
      x += barWidth + 1;
    }
    animationFrameIdRef.current = requestAnimationFrame(drawSpectrum);
  }, []);


  const handleAudioReady = useCallback(() => {
    console.log("ProcessingZone: handleAudioReady called by AudioPlayer. AudioContext state:", audioContextRef.current?.state);
    if (audioContextRef.current && audioContextRef.current.state === 'running' && analyserRef.current) {
      console.log("ProcessingZone: Context is running, starting/restarting spectrum draw.");
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      drawSpectrum(); 
    } else if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      console.warn("ProcessingZone: AudioContext is still suspended when handleAudioReady was called. User interaction with AudioPlayer controls should resume it.");
      
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = requestAnimationFrame(drawSpectrum);
    } else {
      console.log("ProcessingZone: handleAudioReady - conditions not fully met to start spectrum. Context state:", audioContextRef.current?.state, "Analyser:", !!analyserRef.current);
    }
  }, [drawSpectrum]);

  useEffect(() => {
    if (!selectedAudio) {
      console.log('ProcessingZone: No selectedAudio, cancelling animation frame if active.');
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    } else if (audioContextRef.current) { // Jeśli jest wybrane audio, zaloguj stan kontekstu
        console.log('ProcessingZone: selectedAudio changed or component updated. Current AudioContext state:', audioContextRef.current.state);
    }
  }, [selectedAudio]);


  if (!selectedAudio) {
    return (
      <div className="zone">
        <h2>3. Przetwarzanie i Prezentacja Efektu</h2>
        <p>Wybierz plik z galerii, aby zobaczyć opcje przetwarzania.</p>
      </div>
    );
  }

  return (
    <div className="zone">
      <h2>3. Przetwarzanie i Prezentacja Efektu: {selectedAudio.name}</h2>
      
      {/* Informacja o stanie AudioContext dla celów deweloperskich */}
      {audioContextRef.current && (
        <p style={{fontSize: '0.9em', fontStyle: 'italic'}}>
          Stan AudioContext: <span style={{fontWeight: 'bold', color: audioContextRef.current.state === 'running' ? 'green' : 'red'}}>{audioContextRef.current.state}</span>
        </p>
      )}

      {audioContextRef.current && ( // Renderuj AudioPlayer tylko gdy kontekst jest (potencjalnie) gotowy
        <AudioPlayer
          key={selectedAudio.id} // Ważne dla resetowania AudioPlayera przy zmianie pliku
          src={selectedAudio.url}
          audioContext={audioContextRef.current}
          analyserNodeToConnect={analyserRef.current}
          onAudioReady={handleAudioReady}
          gainValue={gain}
          filterType={filterType === 'none' ? null : filterType}
          filterFreq={filterFrequency}
          // onLoadedMetadata={(duration) => console.log('ProcessingZone received onLoadedMetadata, duration:', duration)}
          // onTimeUpdate={(currentTime, duration) => console.log('ProcessingZone received onTimeUpdate:', currentTime, '/', duration)}
        />
      )}

      <div className="processing-controls">
        {/* Kontrolki gain i filter */}
        <div>
          <label htmlFor="gain">Wzmocnienie (Głośność): {Number(gain).toFixed(2)}</label>
          <input type="range" id="gain" min="0" max="2" step="0.05" value={gain} onChange={(e) => setGain(parseFloat(e.target.value))} />
        </div>
        <div>
          <label htmlFor="filterType">Typ Filtra:</label>
          <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="none">Brak (None)</option>
            <option value="lowpass">Dolnoprzepustowy (Low-pass)</option>
            <option value="highpass">Górnoprzepustowy (High-pass)</option>
            <option value="bandpass">Pasmowoprzepustowy (Band-pass)</option>
            <option value="notch">Pasmowozaporowy (Notch)</option>
          </select>
        </div>
        {filterType !== 'none' && (
          <div>
            <label htmlFor="filterFreq">Częstotliwość Filtra: {filterFrequency} Hz</label>
            <input type="range" id="filterFreq" min="20" max="20000" step="10" value={filterFrequency} onChange={(e) => setFilterFrequency(parseInt(e.target.value, 10))} />
          </div>
        )}

        <h3>Widmo Częstotliwości</h3>
        <canvas ref={canvasRef} width="600" height="150" className="spectrum-canvas"></canvas>
        <p style={{ fontSize: '0.8em', color: '#666' }}>
          Kliknij przycisk "play" na odtwarzaczu, aby rozpocząć odtwarzanie i aktywować AudioContext (szczególnie w Chrome).
        </p>
      </div>
    </div>
  );
}

export default ProcessingZone;