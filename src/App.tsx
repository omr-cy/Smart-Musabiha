import { useState, useEffect, useCallback, useRef } from 'react';
import 'regenerator-runtime/runtime';
import { motion, AnimatePresence } from 'motion/react';
import { createModel } from 'vosk-browser';
import { 
  Mic, 
  Settings, 
  RotateCcw, 
  Plus, 
  Trash2, 
  X, 
  Check,
  Edit3,
  Volume2,
  VolumeX,
  Eye,
  Loader2
} from 'lucide-react';
import { Dhikr, INITIAL_DHIKRS } from './types';

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(5).fill(0));
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [editingDhikr, setEditingDhikr] = useState<Dhikr | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    status: 'متوقف',
    lastEvent: 'لا يوجد',
    hasSound: false,
    hasSpeech: false
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const lastProcessedTextRef = useRef('');
  const sessionCountsRef = useRef<Record<string, number>>({});
  const lastResultsLengthRef = useRef(0);

  const colors = [
    '#2DD4BF', // Teal
    '#FACC15', // Yellow
    '#34D399', // Emerald
    '#38BDF8', // Sky
    '#F87171', // Red
    '#A78BFA', // Violet
    '#FB923C', // Orange
    '#F472B6', // Pink
  ];

  const [dhikrs, setDhikrs] = useState<Dhikr[]>(() => {
    const saved = localStorage.getItem('dhikrs');
    return saved ? JSON.parse(saved) : INITIAL_DHIKRS;
  });

  // Arabic normalization helper
  const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[ؤ]/g, 'و')
      .replace(/[ئ]/g, 'ي')
      .replace(/[\u064B-\u0652]/g, '') // Remove Tashkeel
      .replace(/[^\u0621-\u064A\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleIncrement = useCallback((id: string) => {
    setDhikrs(prev => prev.map(d => {
      if (d.id === id) {
        if (navigator.vibrate) navigator.vibrate(50);
        return { ...d, count: d.count + 1 };
      }
      return d;
    }));
  }, []);

  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const addToLog = (msg: string) => {
    setDebugLog(prev => [new Date().toLocaleTimeString() + ': ' + msg, ...prev].slice(0, 15));
  };

  // Vosk Speech Recognition Setup
  useEffect(() => {
    const initVosk = async () => {
      if (modelReady || modelLoading) return;
      
      try {
        setModelLoading(true);
        addToLog('🔄 جاري تحميل موديل Vosk (العربية)...');
        
        // Small Arabic model URL
        const modelUrl = 'https://alphacephei.com/vosk/models/vosk-model-small-ar-0.3.tar.gz';
        const model = await createModel(modelUrl);
        modelRef.current = model;
        
        setModelReady(true);
        setModelLoading(false);
        addToLog('✅ موديل Vosk جاهز للعمل');
      } catch (err: any) {
        console.error('Vosk init error:', err);
        addToLog(`❌ خطأ في تحميل الموديل: ${err.message}`);
        setModelLoading(false);
      }
    };

    if (isListening && !modelReady) {
      initVosk();
    }
  }, [isListening, modelReady, modelLoading]);

  useEffect(() => {
    const startVoskRecognition = async () => {
      if (!modelRef.current || !isListening) return;

      try {
        addToLog('▶️ بدء التعرف عبر Vosk...');
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const recognizer = new modelRef.current.KaldiRecognizer(audioContextRef.current.sampleRate);
        recognizerRef.current = recognizer;
        
        recognizer.on('result', (message: any) => {
          const result = message.result;
          if (result && result.text) {
            processVoskResult(result.text, true);
          }
        });
        
        recognizer.on('partialresult', (message: any) => {
          const partial = message.result.partial;
          if (partial) {
            processVoskResult(partial, false);
          }
        });

        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        processor.onaudioprocess = (event) => {
          if (!isListening) return;
          const data = event.inputBuffer.getChannelData(0);
          recognizer.acceptWaveform(data);
        };

        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        
        setDebugInfo(prev => ({ ...prev, status: 'نشط', lastEvent: 'vosk_started' }));
      } catch (err: any) {
        addToLog(`❌ خطأ في تشغيل Vosk: ${err.message}`);
        setIsListening(false);
      }
    };

    const processVoskResult = (text: string, isFinal: boolean) => {
      const normalized = normalizeArabic(text);
      if (isFinal) {
        setTranscript(prev => prev + ' ' + text);
        setInterimTranscript('');
      } else {
        setInterimTranscript(text);
      }

      if (normalized && normalized !== lastProcessedTextRef.current) {
        addToLog(`🎤 Vosk: ${text.slice(-15)}...`);
        
        dhikrs.forEach(dhikr => {
          const keywords = [dhikr.text, ...dhikr.keywords];
          let maxMatchesInCurrent = 0;

          keywords.forEach(kw => {
            const normKw = normalizeArabic(kw);
            if (!normKw || normKw.length < 2) return;

            const regex = new RegExp(normKw, 'g');
            const matches = (normalized.match(regex) || []).length;
            if (matches > maxMatchesInCurrent) maxMatchesInCurrent = matches;
          });

          const previousMax = sessionCountsRef.current[dhikr.id] || 0;
          
          if (maxMatchesInCurrent > previousMax) {
            const diff = maxMatchesInCurrent - previousMax;
            for (let j = 0; j < diff; j++) {
              handleIncrement(dhikr.id);
              addToLog(`✨ تم عد: ${dhikr.text}`);
            }
            sessionCountsRef.current[dhikr.id] = maxMatchesInCurrent;
          }
        });
        lastProcessedTextRef.current = normalized;
      }
    };

    if (isListening && modelReady) {
      startVoskRecognition();
    } else if (!isListening) {
      stopVoskRecognition();
    }

    return () => {
      stopVoskRecognition();
    };
  }, [isListening, modelReady, dhikrs, handleIncrement]);

  const stopVoskRecognition = () => {
    addToLog('⏹️ إيقاف Vosk...');
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (recognizerRef.current) {
      recognizerRef.current.remove();
      recognizerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setDebugInfo(prev => ({ ...prev, status: 'متوقف', lastEvent: 'vosk_stopped' }));
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setInterimTranscript('');
      setTranscript('');
      lastProcessedTextRef.current = '';
      sessionCountsRef.current = {};
      lastResultsLengthRef.current = 0;
    } else {
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
      lastProcessedTextRef.current = '';
      sessionCountsRef.current = {};
      lastResultsLengthRef.current = 0;
    }
  };

  // Audio Visualization Logic
  const startVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 64;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const levels = [];
        for (let i = 0; i < 5; i++) {
          const index = Math.floor((i / 5) * bufferLength);
          levels.push(dataArray[index] / 255);
        }
        setAudioLevel(levels);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      
      updateVisualizer();
    } catch (err) {
      console.error("Error accessing microphone for visualization:", err);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setAudioLevel(new Array(5).fill(0));
  };

  useEffect(() => {
    // Disable visualizer when listening to avoid microphone conflicts on some devices
    if (isListening) {
      stopVisualizer();
    } else {
      // No-op, visualizer is only started manually or via other logic
    }
  }, [isListening]);

  useEffect(() => {
    localStorage.setItem('dhikrs', JSON.stringify(dhikrs));
  }, [dhikrs]);

  const testMicrophone = async () => {
    try {
      setDebugInfo(prev => ({ ...prev, lastEvent: 'جاري اختبار الميكروفون...' }));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setDebugInfo(prev => ({ ...prev, lastEvent: '✅ الميكروفون يعمل', hasSound: true }));
      stream.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      setDebugInfo(prev => ({ ...prev, lastEvent: `❌ خطأ: ${err.message}` }));
    }
  };

  const totalCount = dhikrs.reduce((acc, d) => acc + d.count, 0);

  const handleReset = () => {
    setDhikrs(prev => prev.map(d => ({ ...d, count: 0 })));
    setShowResetConfirm(false);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };

  const deleteDhikr = (id: string) => {
    setDhikrs(prev => prev.filter(d => d.id !== id));
  };

  const startAddDhikr = () => {
    setIsAddingNew(true);
    setEditingDhikr({
      id: Date.now().toString(),
      text: '',
      count: 0,
      target: 33,
      color: colors[0],
      keywords: []
    });
  };

  const saveDhikr = () => {
    if (!editingDhikr || !editingDhikr.text.trim()) return;
    
    const baseText = editingDhikr.text.trim();
    const words = baseText.split(/\s+/);
    const keywords = Array.from(new Set([
      baseText,
      ...words,
      baseText.replace(/\s+/g, ''),
      baseText.replace(/ة/g, 'ه'),
      baseText.replace(/ه/g, 'ة'),
      baseText.replace(/[أإآ]/g, 'ا'),
    ])).filter(k => k.length > 1);

    const finalDhikr = {
      ...editingDhikr,
      text: baseText,
      keywords
    };
    
    if (isAddingNew) setDhikrs(prev => [...prev, finalDhikr]);
    else setDhikrs(prev => prev.map(d => d.id === finalDhikr.id ? finalDhikr : d));
    setEditingDhikr(null);
    setIsAddingNew(false);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans flex flex-col p-6 dir-rtl" dir="rtl">
      <header className="flex justify-between items-center mb-8">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className={`p-2 rounded-lg transition-colors ${showDebug ? 'bg-gold text-dark-bg' : 'bg-white/5 text-gray-500'}`}
        >
          <Eye size={20} />
        </button>
        <div className="bg-card-bg/50 px-8 py-4 rounded-2xl border border-white/5">
          <h1 className="text-gold text-2xl font-bold tracking-wide">المسبحة الصوتية الذكية</h1>
        </div>
        <div className="w-10" />
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-b from-card-bg to-black/40 rounded-3xl p-8 mb-8 text-center border border-white/5 dhikr-card-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gold/30 rounded-full blur-sm" />
        <p className="text-gray-400 text-sm mb-2">مجموع التسبيح</p>
        <motion.p 
          key={totalCount}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-6xl font-bold text-gold"
        >
          {totalCount}
        </motion.p>
        
        <AnimatePresence>
          {isListening && showDebug && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex flex-col items-center gap-2 overflow-hidden"
            >
              <div className="bg-black/40 p-2 rounded-xl w-full text-[10px] text-white/40 font-mono text-center break-words border border-white/5">
                <p className="text-gold/30 mb-1">حالة المحرك: {debugInfo.status}</p>
                <p className="mb-1">آخر حدث: {debugInfo.lastEvent}</p>
                <p className="mb-1">صوت: {debugInfo.hasSound ? '✅' : '❌'} | كلام: {debugInfo.hasSpeech ? '✅' : '❌'}</p>
                <p className="text-white/60 border-t border-white/5 mt-1 pt-1">{interimTranscript || transcript || 'بانتظار صوتك...'}</p>
                <div className="mt-2 text-[8px] text-left space-y-1 max-h-24 overflow-y-auto bg-black/20 p-1 rounded">
                  {debugLog.map((log, i) => (
                    <div key={i} className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : ''}>
                      {log}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); testMicrophone(); }}
                    className="flex-1 bg-white/10 px-2 py-1 rounded text-[8px] hover:bg-white/20"
                  >
                    اختبار الميكروفون
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDebugLog([]); }}
                    className="bg-white/10 px-2 py-1 rounded text-[8px] hover:bg-white/20"
                  >
                    مسح السجل
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pb-32">
        {dhikrs.map((dhikr) => (
          <motion.button
            key={dhikr.id}
            whileTap={{ scale: 0.95 }}
            onContextMenu={(e) => {
              e.preventDefault();
              setIsAddingNew(false);
              setEditingDhikr(dhikr);
            }}
            onClick={() => handleIncrement(dhikr.id)}
            className="bg-card-bg rounded-3xl p-6 flex flex-col items-center justify-center border border-white/5 relative group h-48"
          >
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full" style={{ backgroundColor: dhikr.color }} />
            <p className="text-4xl font-bold mb-4" style={{ color: dhikr.color }}>{dhikr.count}</p>
            <p className="text-lg font-medium text-gray-300">{dhikr.text}</p>
            <div className="absolute bottom-4 text-[10px] text-gray-500">
              {dhikr.count} / {dhikr.target}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-between items-center bg-gradient-to-t from-dark-bg via-dark-bg/90 to-transparent">
        <button 
          onClick={() => setShowSettings(true)}
          className="w-14 h-14 bg-card-bg rounded-2xl flex items-center justify-center border border-white/10"
        >
          <Settings className="text-gray-400" size={24} />
        </button>

        <div className="relative">
          <motion.button
            animate={isListening ? { 
              scale: [1, 1.1, 1],
              boxShadow: [
                "0 0 0 0px rgba(250, 204, 21, 0.4)",
                "0 0 0 15px rgba(250, 204, 21, 0)",
                "0 0 0 0px rgba(250, 204, 21, 0)"
              ]
            } : {}}
            transition={isListening ? { 
              scale: { repeat: Infinity, duration: 2 },
              boxShadow: { repeat: Infinity, duration: 1.5 }
            } : {}}
            onClick={toggleListening}
            disabled={modelLoading}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all relative overflow-hidden ${modelLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gold shadow-gold/20'}`}
          >
            {modelLoading ? (
              <Loader2 className="text-white animate-spin" size={32} />
            ) : isListening ? (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: ["10px", "30px", "10px"] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                    className="w-1 bg-dark-bg rounded-full"
                  />
                ))}
              </div>
            ) : (
              <Mic className="text-dark-bg" size={32} />
            )}
          </motion.button>
          <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-400">
            {isListening ? 'جاري الاستماع...' : 'اضغط للتسبيح بالصوت'}
          </p>
        </div>

        <button 
          onClick={() => setShowResetConfirm(true)}
          className="w-14 h-14 bg-card-bg rounded-2xl flex items-center justify-center border border-white/10"
        >
          <RotateCcw className="text-gray-400" size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-card-bg rounded-t-[40px] z-50 p-8 max-h-[80vh] overflow-y-auto border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">تخصيص الأذكار</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 mb-8">
                {dhikrs.map(dhikr => (
                  <div key={dhikr.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dhikr.color }} />
                      <div>
                        <p className="font-medium">{dhikr.text}</p>
                        <p className="text-xs text-gray-500">الهدف: {dhikr.target}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setIsAddingNew(false); setEditingDhikr(dhikr); }} className="p-2 text-gray-400 hover:text-white">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => deleteDhikr(dhikr.id)} className="p-2 text-red-400 hover:text-red-300">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={startAddDhikr} className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-2 text-gold hover:bg-gold/5">
                  <Plus size={20} />
                  <span>إضافة ذكر جديد</span>
                </button>
              </div>
              <button onClick={() => { setDhikrs(INITIAL_DHIKRS); setShowSettings(false); }} className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-white">
                <RotateCcw size={16} />
                <span>استعادة الإعدادات الافتراضية</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingDhikr && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setEditingDhikr(null); setIsAddingNew(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card-bg p-8 rounded-[32px] w-full max-w-md relative z-10 border border-white/10">
              <h3 className="text-xl font-bold mb-6 text-center">{isAddingNew ? 'إضافة ذكر جديد' : 'تعديل الذكر'}</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">النص (مثال: سبحان الله)</label>
                  <input type="text" placeholder="اكتب الذكر هنا..." value={editingDhikr.text} onChange={(e) => setEditingDhikr({...editingDhikr, text: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-lg focus:outline-none focus:border-gold" autoFocus />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">الهدف</label>
                  <input type="number" value={editingDhikr.target} onChange={(e) => setEditingDhikr({...editingDhikr, target: parseInt(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-lg focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">اختر لوناً</label>
                  <div className="flex flex-wrap justify-center gap-3">
                    {colors.map(color => (
                      <button key={color} onClick={() => setEditingDhikr({...editingDhikr, color})} className={`w-8 h-8 rounded-full border-2 transition-all ${editingDhikr.color === color ? 'border-white scale-125' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={saveDhikr} disabled={!editingDhikr.text.trim()} className={`flex-1 font-bold py-4 rounded-2xl transition-colors ${editingDhikr.text.trim() ? 'bg-gold text-dark-bg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>حفظ</button>
                  <button onClick={() => { setEditingDhikr(null); setIsAddingNew(false); }} className="flex-1 bg-white/5 font-bold py-4 rounded-2xl">إلغاء</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowResetConfirm(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card-bg p-8 rounded-[32px] w-full max-w-sm relative z-10 border border-white/10 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><RotateCcw className="text-red-500" size={32} /></div>
              <h3 className="text-xl font-bold mb-2">تصفير العدادات؟</h3>
              <p className="text-gray-400 mb-8">هل أنت متأكد من رغبتك في تصفير جميع العدادات الحالية؟</p>
              <div className="flex gap-4">
                <button onClick={handleReset} className="flex-1 bg-red-500 text-white font-bold py-4 rounded-2xl">نعم، تصفير</button>
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-white/5 font-bold py-4 rounded-2xl">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPermissionError && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPermissionError(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card-bg p-8 rounded-[32px] w-full max-w-md relative z-10 border border-white/10">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><VolumeX className="text-red-500" size={40} /></div>
              <h3 className="text-xl font-bold mb-4 text-center text-red-500">مشكلة في الوصول للميكروفون</h3>
              <div className="space-y-4 text-right text-gray-300">
                <p>يرجى اتباع الآتي:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>اضغط على أيقونة القفل (🔒) بجانب الرابط.</li>
                  <li>تأكد من تفعيل "الميكروفون".</li>
                  <li>قم بتحديث الصفحة.</li>
                </ol>
                <button onClick={() => setShowPermissionError(false)} className="w-full bg-gold text-dark-bg font-bold py-4 rounded-2xl mt-4">حسناً</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
