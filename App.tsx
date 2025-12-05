import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, HistoricalEra, GeneratedResult, ProcessingStatus } from './types';
import { HISTORICAL_ERAS } from './constants';
import { travelThroughTime, generateBackstory } from './services/geminiService';
import { Button } from './components/Button';
import { EraCard } from './components/EraCard';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [selectedEra, setSelectedEra] = useState<HistoricalEra | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('initializing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera when entering CAPTURE state
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (appState === AppState.CAPTURE) {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } catch (err) {
          console.error("Camera error:", err);
          setErrorMsg("Could not access camera. Please try uploading a file instead.");
        }
      };
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [appState]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        // Mirror the image if using front camera (standard UX)
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, -canvas.width, canvas.height);
        ctx.restore();
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setSourceImage(dataUrl);
        setAppState(AppState.SELECT_ERA);
      }
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setAppState(AppState.SELECT_ERA);
      };
      reader.readAsDataURL(file);
    }
  };

  const startTimeTravel = async () => {
    if (!sourceImage || !selectedEra) return;

    setAppState(AppState.PROCESSING);
    setErrorMsg(null);

    try {
      setProcessingStatus('generating_image');
      const generatedImage = await travelThroughTime(
        sourceImage, 
        selectedEra.prompt, 
        customPrompt
      );

      setProcessingStatus('analyzing_history');
      const backstory = await generateBackstory(generatedImage, selectedEra.name);

      setResult({
        imageUrl: generatedImage,
        backstory: backstory
      });
      
      setProcessingStatus('complete');
      setAppState(AppState.RESULT);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Time travel malfunctioned. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const reset = () => {
    setAppState(AppState.LANDING);
    setSourceImage(null);
    setResult(null);
    setSelectedEra(null);
    setCustomPrompt('');
    setErrorMsg(null);
  };

  const downloadImage = () => {
    if (result?.imageUrl) {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `chronosnap-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Renders ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center max-w-2xl mx-auto">
      <div className="mb-8 relative">
        <div className="absolute -inset-1 rounded-full bg-amber-500 blur opacity-30 animate-pulse"></div>
        <div className="relative bg-slate-900 rounded-full p-6 border-2 border-amber-500/50">
          <span className="text-6xl">⏳</span>
        </div>
      </div>
      <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500 filter drop-shadow-lg brand-font">
        ChronoSnap
      </h1>
      <p className="text-lg md:text-xl text-slate-400 mb-8 font-light">
        Step into the quantum photo booth. Transport your selfies across history using the power of Gemini AI.
      </p>
      <Button onClick={() => setAppState(AppState.CAPTURE)} className="text-lg px-8 py-4">
        Enter the Booth
      </Button>
    </div>
  );

  const renderCapture = () => (
    <div className="flex flex-col items-center min-h-screen p-4 pt-10 w-full max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-amber-100 brand-font">Capture Your Present Self</h2>
      
      {errorMsg && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4 w-full">
          {errorMsg}
        </div>
      )}

      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 mb-8 group">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover transform scale-x-[-1]" 
          autoPlay 
          playsInline 
          muted 
        />
        <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-2xl"></div>
        {/* Camera Guidelines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-80 border-2 border-dashed border-amber-500 rounded-full"></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
        <Button onClick={capturePhoto} className="flex-1 max-w-xs">
          📸 Snap Photo
        </Button>
        <div className="flex items-center justify-center text-slate-400 font-sm">OR</div>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1 max-w-xs">
          📂 Upload Image
        </Button>
      </div>
      
      <button onClick={() => setAppState(AppState.LANDING)} className="mt-8 text-slate-500 hover:text-slate-300 underline">
        Back to Start
      </button>
    </div>
  );

  const renderSelection = () => (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 w-full max-w-5xl mx-auto">
      <div className="flex w-full justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-amber-100 brand-font">Select Your Destination</h2>
        <button onClick={() => setAppState(AppState.CAPTURE)} className="text-sm text-amber-500 hover:text-amber-400">
          Retake Photo
        </button>
      </div>

      <div className="flex flex-col lg:flex-row w-full gap-8">
        {/* Preview Panel */}
        <div className="w-full lg:w-1/3 flex flex-col items-center">
          <div className="glass-panel p-2 rounded-xl mb-4 w-full">
             {sourceImage && (
               <img src={sourceImage} alt="Source" className="w-full h-auto rounded-lg shadow-inner" />
             )}
          </div>
          
          <div className="w-full glass-panel p-4 rounded-xl">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Add Specific Instructions (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder='e.g., "Make me a king", "Add a parrot on my shoulder"'
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-slate-200 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none h-24 resize-none"
            />
          </div>
        </div>

        {/* Selection Grid */}
        <div className="w-full lg:w-2/3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {HISTORICAL_ERAS.map((era) => (
              <EraCard 
                key={era.id} 
                era={era} 
                isSelected={selectedEra?.id === era.id} 
                onSelect={setSelectedEra} 
              />
            ))}
          </div>

          <div className="sticky bottom-4 z-10 bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-2xl">
             <Button 
               onClick={startTimeTravel} 
               disabled={!selectedEra} 
               className="w-full text-lg shadow-amber-500/20"
             >
               {selectedEra ? `Travel to ${selectedEra.name}` : 'Select a Destination'}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-t-4 border-amber-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
           {selectedEra?.emoji}
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-amber-100 mb-2 brand-font">Time Traveling...</h2>
      <p className="text-slate-400 animate-pulse">
        {processingStatus === 'generating_image' && "Weaving the fabric of spacetime..."}
        {processingStatus === 'analyzing_history' && "Consulting historical archives..."}
      </p>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 max-w-4xl mx-auto">
       <h2 className="text-3xl font-bold mb-6 text-amber-100 brand-font">Arrival Confirmed: {selectedEra?.name}</h2>
       
       <div className="flex flex-col md:flex-row gap-8 w-full bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-2xl">
          {/* Image Side */}
          <div className="w-full md:w-1/2">
             <div className="relative group rounded-lg overflow-hidden border-4 border-amber-900/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
               {result?.imageUrl && (
                 <img src={result.imageUrl} alt="Result" className="w-full h-auto" />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                  <span className="text-white text-sm font-light">Generated by Gemini 2.5 Flash Image</span>
               </div>
             </div>
          </div>

          {/* Info Side */}
          <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6">
             <div>
                <h3 className="text-xl font-bold text-amber-400 mb-3 border-b border-amber-500/30 pb-2">Historical Archives</h3>
                <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 italic text-slate-300 leading-relaxed font-serif">
                   "{result?.backstory}"
                </div>
                <div className="mt-2 text-xs text-slate-500 text-right">Analysis by Gemini 3 Pro</div>
             </div>

             <div className="flex flex-col gap-3">
                <Button onClick={downloadImage} variant="primary">
                  💾 Save Souvenir
                </Button>
                <Button onClick={reset} variant="secondary">
                  🔄 Time Travel Again
                </Button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-3xl font-bold text-red-400 mb-4 brand-font">System Failure</h2>
      <p className="text-slate-300 mb-8 max-w-md">{errorMsg}</p>
      <Button onClick={reset} variant="secondary">Return to Safety</Button>
    </div>
  );

  switch (appState) {
    case AppState.LANDING: return renderLanding();
    case AppState.CAPTURE: return renderCapture();
    case AppState.SELECT_ERA: return renderSelection();
    case AppState.PROCESSING: return renderProcessing();
    case AppState.RESULT: return renderResult();
    case AppState.ERROR: return renderError();
    default: return renderLanding();
  }
};

export default App;