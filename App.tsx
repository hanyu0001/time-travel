import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AppMode, HistoricalEra, GeneratedResult, ProcessingStatus } from './types';
import { HISTORICAL_ERAS } from './constants';
import { travelThroughTime, generateBackstory, editImage, analyzeImage } from './services/geminiService';
import { Button } from './components/Button';
import { EraCard } from './components/EraCard';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.TIME_TRAVEL);
  
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
          setErrorMsg("无法访问摄像头，请尝试上传文件。");
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
        
        // Analyze mode skips config screen
        if (appMode === AppMode.ANALYZE) {
            startAnalysis(dataUrl);
        } else {
            setAppState(AppState.CONFIG);
        }
      }
    }
  }, [appMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSourceImage(dataUrl);
        
        // Analyze mode skips config screen
        if (appMode === AppMode.ANALYZE) {
            startAnalysis(dataUrl);
        } else {
            setAppState(AppState.CONFIG);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async (img: string) => {
      setAppState(AppState.PROCESSING);
      setErrorMsg(null);
      setProcessingStatus('analyzing_image');
      
      try {
          const analysisText = await analyzeImage(img);
          setResult({
              imageUrl: img,
              text: analysisText
          });
          setProcessingStatus('complete');
          setAppState(AppState.RESULT);
      } catch (error: any) {
          console.error(error);
          setErrorMsg(error.message || "分析失败，请重试。");
          setAppState(AppState.ERROR);
      }
  };

  const startProcessing = async () => {
    if (!sourceImage) return;

    setAppState(AppState.PROCESSING);
    setErrorMsg(null);

    try {
      if (appMode === AppMode.TIME_TRAVEL) {
          if (!selectedEra) return;
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
      } else if (appMode === AppMode.MAGIC_EDIT) {
          setProcessingStatus('generating_image');
          if (!customPrompt) throw new Error("请输入编辑指令");
          
          const generatedImage = await editImage(sourceImage, customPrompt);
          setResult({
              imageUrl: generatedImage,
              text: `编辑指令: ${customPrompt}`
          });
      }
      
      setProcessingStatus('complete');
      setAppState(AppState.RESULT);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "处理失败，请重试。");
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

  const selectMode = (mode: AppMode) => {
      setAppMode(mode);
      setAppState(AppState.CAPTURE);
      setCustomPrompt('');
  }

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center max-w-4xl mx-auto">
      <div className="mb-8 relative">
        <div className="absolute -inset-1 rounded-full bg-amber-500 blur opacity-30 animate-pulse"></div>
        <div className="relative bg-slate-900 rounded-full p-6 border-2 border-amber-500/50">
          <span className="text-6xl">✨</span>
        </div>
      </div>
      <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500 filter drop-shadow-lg brand-font">
        ChronoSnap
      </h1>
      <p className="text-lg md:text-xl text-slate-400 mb-12 font-light">
        体验 Gemini AI 的强大功能：时空穿越、魔法编辑、图像分析。
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <button onClick={() => selectMode(AppMode.TIME_TRAVEL)} className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center">
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">⏳</span>
              <h3 className="text-xl font-bold text-slate-200 mb-2">时空穿越</h3>
              <p className="text-sm text-slate-400">将你的自拍传送到历史上的不同时代。</p>
          </button>
          
          <button onClick={() => selectMode(AppMode.MAGIC_EDIT)} className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center">
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">✏️</span>
              <h3 className="text-xl font-bold text-slate-200 mb-2">魔法编辑</h3>
              <p className="text-sm text-slate-400">使用文字指令修改你的照片。</p>
          </button>

          <button onClick={() => selectMode(AppMode.ANALYZE)} className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center">
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">👁️</span>
              <h3 className="text-xl font-bold text-slate-200 mb-2">图像分析</h3>
              <p className="text-sm text-slate-400">上传照片，让 AI 告诉你看到了什么。</p>
          </button>
      </div>
    </div>
  );

  const renderCapture = () => (
    <div className="flex flex-col items-center min-h-screen p-4 pt-10 w-full max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-amber-100 brand-font">
          {appMode === AppMode.ANALYZE ? '上传需要分析的图片' : '拍摄或上传照片'}
      </h2>
      
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
          📸 拍照
        </Button>
        <div className="flex items-center justify-center text-slate-400 font-sm">或</div>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1 max-w-xs">
          📂 上传图片
        </Button>
      </div>
      
      <button onClick={() => setAppState(AppState.LANDING)} className="mt-8 text-slate-500 hover:text-slate-300 underline">
        返回主页
      </button>
    </div>
  );

  const renderConfig = () => {
      // Config screen varies by mode
      if (appMode === AppMode.TIME_TRAVEL) {
          return (
            <div className="flex flex-col items-center min-h-screen p-4 pt-8 w-full max-w-5xl mx-auto">
              <div className="flex w-full justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-amber-100 brand-font">选择你的目的地</h2>
                <button onClick={() => setAppState(AppState.CAPTURE)} className="text-sm text-amber-500 hover:text-amber-400">
                  重拍
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
                      附加指令 (可选)
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder='例如："让我变成国王", "肩上加一只鹦鹉"'
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
                      onClick={startProcessing} 
                      disabled={!selectedEra} 
                      className="w-full text-lg shadow-amber-500/20"
                    >
                      {selectedEra ? `前往 ${selectedEra.name}` : '选择目的地'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
      } 
      
      if (appMode === AppMode.MAGIC_EDIT) {
           return (
            <div className="flex flex-col items-center min-h-screen p-4 pt-8 w-full max-w-3xl mx-auto">
              <div className="flex w-full justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-amber-100 brand-font">魔法编辑</h2>
                <button onClick={() => setAppState(AppState.CAPTURE)} className="text-sm text-amber-500 hover:text-amber-400">
                  重拍
                </button>
              </div>

              <div className="w-full glass-panel p-2 rounded-xl mb-6">
                 {sourceImage && (
                   <img src={sourceImage} alt="Source" className="w-full max-h-[50vh] object-contain rounded-lg shadow-inner mx-auto" />
                 )}
              </div>
              
              <div className="w-full glass-panel p-6 rounded-xl mb-6">
                <label className="block text-lg font-medium text-amber-400 mb-3">
                  你想怎么修改这张照片？
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder='例如： "添加复古滤镜", "把背景换成海滩", "移除背景中的路人"...'
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-4 text-slate-200 text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none h-32 resize-none"
                />
              </div>

              <Button 
                  onClick={startProcessing} 
                  disabled={!customPrompt.trim()} 
                  className="w-full text-lg shadow-amber-500/20 py-4"
                >
                  开始生成
              </Button>
            </div>
           );
      }

      return null;
  };

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
        <div className="absolute inset-0 rounded-full border-t-4 border-amber-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
           {appMode === AppMode.TIME_TRAVEL ? selectedEra?.emoji : (appMode === AppMode.MAGIC_EDIT ? '✨' : '👁️')}
        </div>
      </div>
      
      <h2 className="text-3xl font-bold text-amber-100 mb-2 brand-font">正在处理中...</h2>
      <p className="text-slate-400 animate-pulse">
        {processingStatus === 'generating_image' && "AI 正在绘制画面..."}
        {processingStatus === 'analyzing_history' && "正在检索历史档案..."}
        {processingStatus === 'analyzing_image' && "AI 正在观察图片细节..."}
      </p>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col items-center min-h-screen p-4 pt-8 max-w-4xl mx-auto">
       <h2 className="text-3xl font-bold mb-6 text-amber-100 brand-font">
           {appMode === AppMode.ANALYZE ? '分析完成' : '生成完成'}
       </h2>
       
       <div className="flex flex-col md:flex-row gap-8 w-full bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-2xl">
          {/* Image Side */}
          <div className="w-full md:w-1/2">
             <div className="relative group rounded-lg overflow-hidden border-4 border-amber-900/30 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
               {result?.imageUrl && (
                 <img src={result.imageUrl} alt="Result" className="w-full h-auto" />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                  <span className="text-white text-sm font-light">Powered by Gemini</span>
               </div>
             </div>
          </div>

          {/* Info Side */}
          <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6">
             <div>
                <h3 className="text-xl font-bold text-amber-400 mb-3 border-b border-amber-500/30 pb-2">
                    {appMode === AppMode.TIME_TRAVEL ? '历史档案' : (appMode === AppMode.ANALYZE ? '图片分析' : '编辑结果')}
                </h3>
                
                {result?.backstory && (
                    <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 italic text-slate-300 leading-relaxed font-serif">
                    "{result.backstory}"
                    </div>
                )}
                
                {result?.text && (
                    <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 text-slate-300 leading-relaxed h-64 overflow-y-auto">
                    {result.text}
                    </div>
                )}
                
                <div className="mt-2 text-xs text-slate-500 text-right">Generate by Gemini 3 Pro / 2.5 Flash</div>
             </div>

             <div className="flex flex-col gap-3">
                <Button onClick={downloadImage} variant="primary">
                  💾 保存图片
                </Button>
                <Button onClick={reset} variant="secondary">
                  🔄 返回主页
                </Button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-3xl font-bold text-red-400 mb-4 brand-font">系统错误</h2>
      <p className="text-slate-300 mb-8 max-w-md">{errorMsg}</p>
      <Button onClick={reset} variant="secondary">返回安全区域</Button>
    </div>
  );

  switch (appState) {
    case AppState.LANDING: return renderLanding();
    case AppState.CAPTURE: return renderCapture();
    case AppState.CONFIG: return renderConfig();
    case AppState.PROCESSING: return renderProcessing();
    case AppState.RESULT: return renderResult();
    case AppState.ERROR: return renderError();
    default: return renderLanding();
  }
};

export default App;