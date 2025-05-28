import React, { useState, useEffect, useRef } from 'react';
import AudioPlayer from './AudioPlayer'; // Importujemy nasz odtwarzacz

function ProcessingZone({ selectedAudio }) {
  const [gain, setGain] = useState(1);
  const [filterType, setFilterType] = useState('none'); // 'lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'
  const [filterFrequency, setFilterFrequency] = useState(350); // Częstotliwość dla filtra
  const [spectrumData, setSpectrumData] = useState(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);


  // Inicjalizacja Web Audio API dla analizatora
  useEffect(() => {
    if (selectedAudio && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Czystka przy odmontowaniu komponentu lub zmianie selectedAudio
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      // Nie zamykamy kontekstu tutaj, ponieważ jest on współdzielony z AudioPlayer
      // if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      //   audioContextRef.current.close().catch(e => console.error("Error closing context:", e));
      //   audioContextRef.current = null;
      // }
    };
  }, [selectedAudio]);


  // Funkcja do rysowania widma
  const drawSpectrum = () => {
    if (!analyserRef.current || !canvasRef.current || !audioContextRef.current) return;
    
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = 'rgb(40, 44, 52)'; // Kolor tła canvasu
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];
      
      const r = barHeight + (25 * (i/bufferLength));
      const g = 250 * (i/bufferLength);
      const b = 50;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

      x += barWidth + 1;
    }
    animationFrameIdRef.current = requestAnimationFrame(drawSpectrum);
  };


  // Podłączenie analizatora i rozpoczęcie rysowania widma
  // Ta funkcja będzie wywoływana z AudioPlayer przez przekazanie referencji
  const setupAnalyser = (audioElement) => {
    if (!selectedAudio || !audioContextRef.current || !audioElement) return;

    const audioContext = audioContextRef.current;
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 2048; // Standardowa wartość
    }
    const analyser = analyserRef.current;

    // Potrzebujemy źródła z elementu audio, aby podłączyć do analizatora
    // To jest nieco skomplikowane, bo AudioPlayer zarządza swoim źródłem.
    // Idealnie, AudioPlayer powinien zwracać swoje węzły lub akceptować węzeł analizatora.
    // Dla uproszczenia, spróbujemy podłączyć się do elementu audio, który jest już w DOM.
    // UWAGA: To może nie być idealne rozwiązanie, jeśli AudioPlayer tworzy złożony graf.
    // Lepszym podejściem byłoby przekazanie `analyserNode` do `AudioPlayer`
    // i połączenie go wewnątrz `AudioPlayer`.
    // Na razie spróbujemy prostego podejścia:
    try {
      const source = audioContext.createMediaElementSource(audioElement);
      // Potrzebujemy jakiegoś węzła przed destination w AudioPlayer, aby podłączyć analyser
      // Na ten moment nie mamy bezpośredniego dostępu do gainNode/filterNode z AudioPlayer w tym komponencie
      // To jest ograniczenie obecnej architektury.
      // Aby widmo działało poprawnie z filtrami, graf audio musi być:
      // source -> filter -> gain -> analyser -> destination
      // source -> gain -> filter -> analyser -> destination
      // W AudioPlayer.js, graf jest source -> gain -> filter -> destination.
      // Brakuje nam "haka" na analyser przed destination.

      // Obejście: Załóżmy, że `AudioPlayer` zawsze podłącza się do `audioContext.destination`.
      // Spróbujemy podłączyć analizator "równolegle" do `destination` TYLKO do celów wizualizacji.
      // To nie pokaże efektu filtrów na widmie, jeśli filtr jest za gain.
      // Aby to poprawnie zaimplementować, `AudioPlayer` musi być bardziej elastyczny.

      // Dla celów demonstracyjnych, załóżmy, że chcemy widmo *po* ewentualnych filtrach
      // i wzmocnieniu, jeśli AudioPlayer by to umożliwiał.
      // Na razie, jeśli AudioPlayer używa tego samego audioContext, możemy spróbować
      // podłączyć analyser do `gainNode` lub `filterNode` z `AudioPlayer`, jeśli byłyby one
      // eksportowane lub zarządzane centralnie.

      // Ponieważ nie mamy dostępu do wewnętrznych węzłów AudioPlayera,
      // poniższe nie zadziała poprawnie z efektami AudioPlayera na widmie.
      // source.connect(analyser);
      // analyser.connect(audioContext.destination); // Analizator nie powinien iść do destination jeśli już jest ścieżka audio

      console.warn("Spectrum analysis might not reflect all audio processing due to component separation. For accurate spectrum after processing, the AudioPlayer component would need to integrate the analyser node into its audio graph before destination.");

      // Na potrzeby tego przykładu, załóżmy, że chcemy widmo bezpośrednio ze źródła.
      // W praktyce, to powinno być bardziej zintegrowane z AudioPlayer.
      if (audioElement && audioContextRef.current && audioContextRef.current.state === 'running') {
        if (!analyserRef.current) {
            analyserRef.current = audioContextRef.current.createAnalyser();
        }
        const internalSource = audioContextRef.current.createMediaElementSource(audioElement);
        internalSource.connect(analyserRef.current);
        // WAŻNE: Nie łączymy `analyserRef.current` z `audioContext.destination` tutaj,
        // ponieważ główny dźwięk jest już obsługiwany przez `AudioPlayer`.
        // Analizator jest tylko do odczytu danych.
      }


    } catch (e) {
      // console.error("Error setting up analyser:", e);
      // To może się zdarzyć, jeśli źródło jest już używane.
      // W takim przypadku, idealnie, AudioContext i source powinny być zarządzane centralnie.
    }

    if (analyserRef.current) {
       if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
       drawSpectrum();
    }
  };


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
      <AudioPlayer
        src={selectedAudio.url}
        gainValue={gain}
        filterType={filterType === 'none' ? null : filterType}
        filterFreq={filterFrequency}
        // Przekazanie funkcji, którą AudioPlayer może wywołać po załadowaniu metadanych,
        // dając nam dostęp do elementu audio dla analizatora.
        // To jest jeden ze sposobów na integrację.
        onLoadedMetadata={(duration) => {
            // console.log("Audio loaded, duration:", duration);
            // Spróbuj znaleźć element audio, który AudioPlayer właśnie załadował
            // To jest trochę "hacky", lepsze byłoby przekazanie refa
            const audioElement = document.querySelector(`audio[src="${selectedAudio.url}"]`);
            if (audioElement) {
                 // Upewnij się, że kontekst jest aktywny (wymaga interakcji użytkownika)
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume().then(() => {
                        // console.log("AudioContext resumed for spectrum");
                        setupAnalyser(audioElement);
                    });
                } else if (audioContextRef.current) {
                    setupAnalyser(audioElement);
                }
            }
        }}
      />

      <div className="processing-controls">
        <div>
          <label htmlFor="gain">Wzmocnienie (Głośność): {Number(gain).toFixed(2)}</label>
          <input
            type="range"
            id="gain"
            min="0"
            max="2"
            step="0.05"
            value={gain}
            onChange={(e) => setGain(parseFloat(e.target.value))}
          />
        </div>

        <div>
          <label htmlFor="filterType">Typ Filtra:</label>
          <select id="filterType" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="none">Brak (None)</option>
            <option value="lowpass">Dolnoprzepustowy (Low-pass)</option>
            <option value="highpass">Górnoprzepustowy (High-pass)</option>
            <option value="bandpass">Pasmowoprzepustowy (Band-pass)</option>
            <option value="notch">Pasmowozaporowy (Notch)</option>
            {/* Można dodać więcej typów filtrów Biquad */}
          </select>
        </div>

        {filterType !== 'none' && (
          <div>
            <label htmlFor="filterFreq">Częstotliwość Filtra: {filterFrequency} Hz</label>
            <input
              type="range"
              id="filterFreq"
              min="20"
              max="20000" // Max dla AudioContext to zwykle połowa sampleRate
              step="10"
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(parseInt(e.target.value, 10))}
            />
          </div>
        )}
        
        <h3>Widmo Częstotliwości</h3>
        <canvas ref={canvasRef} width="600" height="150" className="spectrum-canvas"></canvas>
        <p style={{fontSize: '0.8em', color: '#666'}}>
            Uwaga: Analiza widma jest podstawowa i może wymagać interakcji użytkownika (np. kliknięcia play),
            aby AudioContext został aktywowany w przeglądarce. Poprawna wizualizacja efektów filtrów na widmie
            wymagałaby głębszej integracji analizatora z grafem audio w komponencie AudioPlayer.
        </p>
      </div>
    </div>
  );
}

export default ProcessingZone;