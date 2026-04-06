import { useState, useEffect, useCallback, useRef } from 'react';
import 'regenerator-runtime/runtime';
import { motion, AnimatePresence } from 'motion/react';
import { createModel } from 'vosk-browser';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const AudioMute = registerPlugin<any>('AudioMute');
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
  Loader2,
  Wifi,
  WifiOff,
  Zap,
  Move,
  Heart,
  LayoutGrid,
  Info,
  Wrench
} from 'lucide-react';
import { Dhikr, INITIAL_DHIKRS, RecognitionMode } from './types';

const parseArabicNumbers = (str: string | number): number => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const englishNumbers = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
                            .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  return parseInt(englishNumbers, 10) || 0;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { useGrouping: false }).format(num);
};

const DhikrCard = ({ dhikr, handleIncrement, handleResetSingle, setIsAddingNew, setEditingSource, setEditingDhikr, isOverlay, attributes, listeners }: any) => {
  return (
    <motion.div
      animate={!isOverlay ? { scale: 1 } : {}}
      transition={{ duration: 0, ease: "linear" }}
      whileTap={!isOverlay ? { scale: 0.97 } : {}}
      className={`bg-card-bg rounded-3xl p-6 flex flex-col items-center justify-center border border-white/5 relative group h-48 w-full ${isOverlay ? 'shadow-2xl shadow-black/50 scale-105 cursor-grabbing z-50' : 'cursor-pointer'}`}
      onContextMenu={!isOverlay ? (e) => {
        e.preventDefault();
        setIsAddingNew(false);
        setEditingSource('main');
        setEditingDhikr(dhikr);
      } : undefined}
      onClick={!isOverlay ? () => handleIncrement(dhikr.id) : undefined}
    >
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full" style={{ backgroundColor: dhikr.color }} />
      <button
        className={`absolute top-3 left-3 p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all touch-none ${isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
        title="تحريك"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Move size={14} />
      </button>
      <div className="h-14 flex items-end justify-center pb-2">
        <motion.p 
          key={dhikr.lastIncrement || 'initial'}
          initial={dhikr.lastIncrement ? { textShadow: `0px 0px 12px ${dhikr.color}`, filter: 'brightness(1.25)', scale: 1.01 } : false}
          animate={{ textShadow: `0px 0px 0px ${dhikr.color}00`, filter: 'brightness(1)', scale: 1 }}
          transition={{ duration: 0.04, ease: "linear" }}
          className="text-4xl font-bold leading-none" 
          style={{ color: dhikr.color }}
        >
          {formatNumber(dhikr.count)}
        </motion.p>
      </div>
      <div className="h-16 flex items-start justify-center w-full pt-2">
        <p className={`font-medium text-gray-300 text-center px-2 leading-snug line-clamp-3 ${
          dhikr.text.length <= 15 ? 'text-xs' : 
          dhikr.text.length <= 30 ? 'text-[11px]' : 
          dhikr.text.length <= 50 ? 'text-[9px]' : 'text-[7px]'
        }`}>{dhikr.text}</p>
      </div>
      <div className="absolute bottom-4 right-0 w-full text-center text-[10px] text-gray-500">
        {formatNumber(dhikr.count)} / {formatNumber(dhikr.target)}
      </div>
      <button
        onClick={!isOverlay ? (e) => {
          e.stopPropagation();
          handleResetSingle(dhikr.id);
        } : undefined}
        className="absolute bottom-3 left-3 p-2 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all"
        title="تصفير هذا الذكر"
      >
        <RotateCcw size={14} />
      </button>
    </motion.div>
  );
};

const SortableDhikrItem = (props: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.dhikr.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DhikrCard {...props} attributes={attributes} listeners={listeners} />
    </div>
  );
};

export default function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [editingDhikr, setEditingDhikr] = useState<Dhikr | null>(null);
  const [editingSource, setEditingSource] = useState<'settings' | 'main' | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [developerMode, setDeveloperMode] = useState(() => localStorage.getItem('developerMode') === 'true');
  const [vibrationEnabled, setVibrationEnabled] = useState(() => localStorage.getItem('vibrationEnabled') !== 'false');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [showVoskPrompt, setShowVoskPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>(() => {
    const saved = localStorage.getItem('recognitionMode');
    return (saved as RecognitionMode) || 'auto';
  });
  const [activeEngine, setActiveEngine] = useState<'google' | 'vosk' | null>(null);
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const wakeLockRef = useRef<any>(null);
  const [debugInfo, setDebugInfo] = useState({
    status: 'متوقف',
    lastEvent: 'لا يوجد',
    hasSound: false,
    hasSpeech: false
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setDhikrs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const audioContextRef = useRef<AudioContext | null>(null);
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

  const stopAllEngines = useCallback(() => {
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.onend = null;
        recognitionRef.current.stop(); 
      } catch (e) {}
      recognitionRef.current = null;
    }
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  // Arabic normalization helper
  const normalizeArabic = (text: string) => {
    if (!text) return '';
    let n = text
      .toLowerCase() // Convert to lowercase for English support
      .replace(/[\u064B-\u0652]/g, '') // Remove Tashkeel
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/لله/g, 'الله');
    
    // Allow Arabic and English characters, remove others
    n = n.replace(/[^a-z\u0621-\u064A\s]/g, ' ');
    
    // Handle common Arabic ASR misrecognitions:
    // 1. Remove spaces after 'ال' (Al-) prefix
    n = n.replace(/(^|\s)ال\s+/g, '$1ال');
    
    // Collapse spaces
    n = n.replace(/\s+/g, ' ').trim();
    
    return n;
  };

  const handleIncrement = useCallback((id: string) => {
    setDhikrs(prev => prev.map(d => {
      if (d.id === id) {
        if (d.count >= 99999999) return d;
        if (vibrationEnabled && navigator.vibrate) navigator.vibrate(50);
        return { ...d, count: d.count + 1, lastIncrement: Date.now() };
      }
      return d;
    }));
  }, [vibrationEnabled]);

  const [debugLog, setDebugLog] = useState<string[]>([]);
  
  const addToLog = (msg: string) => {
    setDebugLog(prev => [new Date().toLocaleTimeString() + ': ' + msg, ...prev].slice(0, 15));
  };

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToLog('🌐 متصل بالإنترنت');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToLog('📡 غير متصل بالإنترنت');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem('recognitionMode', recognitionMode);
    localStorage.setItem('developerMode', String(developerMode));
    localStorage.setItem('vibrationEnabled', String(vibrationEnabled));
  }, [recognitionMode, developerMode, vibrationEnabled]);

  const dhikrsRef = useRef(dhikrs);
  useEffect(() => {
    dhikrsRef.current = dhikrs;
  }, [dhikrs]);

  const lastCountTimeRef = useRef<Record<string, number>>({});

  // Unified Transcript Processing
  const processTranscript = useCallback((text: string, source: string) => {
    const normalized = normalizeArabic(text);
    if (!normalized) return;

    // Prevent processing the exact same transcript twice
    if (normalized === lastProcessedTextRef.current) return;
    lastProcessedTextRef.current = normalized;

    const now = Date.now();
    const COOLDOWN = 800; // ms between counts of the same dhikr

    addToLog(`🎤 ${source}: ${text.slice(-20)}...`);
    
    dhikrsRef.current.forEach(dhikr => {
      const keywords = [dhikr.text, ...dhikr.keywords];
      let maxMatchesInCurrent = 0;

      keywords.forEach(kw => {
        const normKw = normalizeArabic(kw);
        if (!normKw || normKw.length < 2) return;

        // Escape regex special characters
        const escapedKw = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Make spaces optional to handle merged words (e.g., "الحمد لله" matches "الحمدلله")
        const flexibleKw = escapedKw.replace(/\s+/g, '\\s*');
        
        // Use word boundaries simulation for Arabic
        const regex = new RegExp(`(^|\\s)${flexibleKw}(\\s|$)`, 'g');
        
        const matches = (normalized.match(regex) || []).length;
        if (matches > maxMatchesInCurrent) maxMatchesInCurrent = matches;
      });

      const previousMax = sessionCountsRef.current[dhikr.id] || 0;
      
      if (maxMatchesInCurrent > previousMax) {
        const lastTime = lastCountTimeRef.current[dhikr.id] || 0;
        
        // Update session count immediately to prevent re-triggering on interim results
        sessionCountsRef.current[dhikr.id] = maxMatchesInCurrent;

        if (now - lastTime > COOLDOWN) {
          handleIncrement(dhikr.id);
          addToLog(`✨ تم عد: ${dhikr.text}`);
          lastCountTimeRef.current[dhikr.id] = now;
        }
      }
    });
  }, [handleIncrement]);

  // Google Speech Recognition Logic
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening && activeEngine === 'google') {
      if (recognitionRef.current) return; // Already initialized

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA';
      
      recognition.onstart = () => {
        setDebugInfo(prev => ({ ...prev, status: 'نشط (بإنترنت)', lastEvent: 'google_start' }));
        addToLog('✅ محرك "بإنترنت" بدأ العمل');
        setActiveEngine('google');
      };

      recognition.onend = () => {
        // Only restart if we haven't manually cleared the ref (which stopAllEngines does)
        if (isListening && activeEngine === 'google' && recognitionRef.current === recognition) {
          addToLog('🔄 إعادة تشغيل محرك "بإنترنت"...');
          try { 
            recognition.start(); 
          } catch (e) {
            // If it fails to restart immediately, try again in a bit
            setTimeout(() => {
              if (isListening && activeEngine === 'google' && recognitionRef.current === recognition) {
                try { recognition.start(); } catch (err) {}
              }
            }, 1000);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') return; // Ignore manual aborts
        addToLog(`❌ خطأ في محرك "بإنترنت": ${event.error}`);
        if (event.error === 'network') {
          addToLog('📡 فشل الاتصال.. جاري التحويل لمحرك "بدون إنترنت"');
        }
      };

      recognition.onresult = (event: any) => {
        if (event.results.length < lastResultsLengthRef.current) {
          sessionCountsRef.current = {};
          lastProcessedTextRef.current = '';
        }
        lastResultsLengthRef.current = event.results.length;

        let fullTranscript = '';
        let currentInterim = '';
        for (let i = 0; i < event.results.length; ++i) {
          const part = event.results[i][0].transcript;
          fullTranscript += (i > 0 ? ' ' : '') + part;
          if (!event.results[i].isFinal) currentInterim += (currentInterim ? ' ' : '') + part;
        }
        setTranscript(fullTranscript);
        setInterimTranscript(currentInterim);
        processTranscript(fullTranscript, 'بإنترنت');
      };

      recognitionRef.current = recognition;
      
      // Small delay to ensure previous instance is fully cleaned up by the browser
      const startTimeout = setTimeout(() => {
        if (isListening && activeEngine === 'google' && recognitionRef.current === recognition) {
          try { 
            recognition.start(); 
          } catch (e) {
            addToLog(`❌ فشل تشغيل محرك "بإنترنت": ${e.message}`);
          }
        }
      }, 100);

      return () => clearTimeout(startTimeout);
    }

    return () => {
      if (recognitionRef.current) {
        try { 
          recognitionRef.current.onend = null;
          recognitionRef.current.stop(); 
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [isListening, activeEngine, processTranscript]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Vosk Speech Recognition Logic
  const initVoskModel = useCallback(async () => {
    if (modelReady || modelLoading) return;
    
    // Check storage permission if on native platform
    if (isNative) {
      try {
        const check = await Filesystem.checkPermissions();
        if (check.publicStorage !== 'granted') {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== 'granted') {
            addToLog('⚠️ محرك "بدون إنترنت" يحتاج لإذن التخزين للعمل');
            return;
          }
        }
      } catch (e) {
        console.error('Storage permission error:', e);
      }
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setModelLoading(true);
      setModelProgress(0);
      addToLog('🔄 جاري تحميل محرك "بدون إنترنت"...');
      
      const modelUrl = '/vosk-model-small-ar-0.3.tar.gz';
      
      // Fetch with progress
      const response = await fetch(modelUrl, { signal });
      if (!response.ok) throw new Error('فشل تحميل الموديل');
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('فشل قراءة بيانات الموديل');
      
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) {
          const progress = Math.round((loaded / total) * 100);
          setModelProgress(progress);
        }
      }
      
      const blob = new Blob(chunks);
      const model = await createModel(URL.createObjectURL(blob));
      
      modelRef.current = model;
      setModelReady(true);
      setModelLoading(false);
      setModelProgress(100);
      addToLog('✅ محرك "بدون إنترنت" جاهز');
      
      if (isListening) {
        setActiveEngine('vosk');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addToLog('⏹️ تم إلغاء تحميل المحرك');
      } else {
        addToLog(`❌ خطأ في محرك "بدون إنترنت": ${err.message}`);
      }
      setModelLoading(false);
      setModelProgress(0);
      stopListening(true);
    }
  }, [modelReady, modelLoading, isListening]);

  useEffect(() => {
    const startVosk = async () => {
      if (!modelRef.current || activeEngine !== 'vosk' || recognizerRef.current) return;
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        // Build a grammar from all dhikr keywords to improve accuracy and reduce false positives
        const allKeywords = dhikrsRef.current.flatMap(d => [d.text, ...d.keywords]);
        const uniqueWords = Array.from(new Set(allKeywords.flatMap(k => k.split(/\s+/))));
        const grammar = JSON.stringify([...allKeywords, ...uniqueWords, "[unk]"]);
        
        const recognizer = new modelRef.current.KaldiRecognizer(audioContextRef.current.sampleRate, grammar);
        recognizerRef.current = recognizer;
        
        recognizer.on('result', (message: any) => {
          if (message.result?.text) {
            setTranscript(prev => {
              const newFull = (prev + ' ' + message.result.text).trim();
              processTranscript(newFull, 'بدون إنترنت');
              return newFull;
            });
            setInterimTranscript('');
          }
        });
        
        recognizer.on('partialresult', (message: any) => {
          if (message.result?.partial) {
            setInterimTranscript(message.result.partial);
            setTranscript(prev => {
              const newFull = (prev + ' ' + message.result.partial).trim();
              processTranscript(newFull, 'بدون إنترنت (P)');
              return prev; // Don't update permanent transcript with partial
            });
          }
        });

        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (event) => {
          if (activeEngine === 'vosk') {
            recognizer.acceptWaveform(event.inputBuffer.getChannelData(0));
          }
        };
        source.connect(processor);
        processor.connect(audioContextRef.current.destination);
        setDebugInfo(prev => ({ ...prev, status: 'نشط (بدون إنترنت)', lastEvent: 'vosk_started' }));
        addToLog('✅ محرك "بدون إنترنت" بدأ العمل');
      } catch (err: any) {
        addToLog(`❌ خطأ تشغيل محرك "بدون إنترنت": ${err.message}`);
        stopListening(true);
      }
    };

    if (isListening && activeEngine === 'vosk' && modelReady) {
      startVosk();
    }

    return () => {
      if (activeEngine === 'vosk') {
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
      }
    };
  }, [isListening, activeEngine, modelReady, processTranscript]);

  // Engine Switching Logic
  useEffect(() => {
    if (!isListening) {
      stopAllEngines();
      setActiveEngine(null);
      setDebugInfo(prev => ({ ...prev, status: 'متوقف', lastEvent: 'stop_all' }));
      return;
    }

    const determineEngine = () => {
      if (recognitionMode === 'google') return 'google';
      if (recognitionMode === 'vosk') return 'vosk';
      return isOnline ? 'google' : 'vosk';
    };

    const targetEngine = determineEngine();
    
    if (targetEngine !== activeEngine) {
      // If we are switching away from vosk while it's loading, abort the load
      if (activeEngine === 'vosk' && modelLoading && targetEngine !== 'vosk') {
        abortControllerRef.current?.abort();
      }

      if (targetEngine === 'vosk' && !modelReady) {
        if (!modelLoading) {
          stopAllEngines();
          setShowVoskPrompt(true);
        stopListening();
        }
      } else {
        stopAllEngines();
        setActiveEngine(targetEngine);
      }
    }
  }, [isListening, recognitionMode, isOnline, modelReady, modelLoading, stopAllEngines]);

  const unmuteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startListening = useCallback(() => {
    setIsListening(true);
    const shouldMute = isNative && (recognitionMode === 'google' || (recognitionMode === 'auto' && isOnline));
    if (shouldMute) {
      if (unmuteTimeoutRef.current) {
        clearTimeout(unmuteTimeoutRef.current);
        unmuteTimeoutRef.current = null;
      }
      AudioMute.mute().catch(console.error);
    }
  }, [isNative, recognitionMode, isOnline]);

  const stopListening = useCallback((immediate = false) => {
    setIsListening(false);
    const shouldMute = isNative && (recognitionMode === 'google' || (recognitionMode === 'auto' && isOnline));
    if (shouldMute) {
      if (unmuteTimeoutRef.current) {
        clearTimeout(unmuteTimeoutRef.current);
        unmuteTimeoutRef.current = null;
      }
      if (immediate) {
        AudioMute.unmute().catch(console.error);
      } else {
        unmuteTimeoutRef.current = setTimeout(() => {
          AudioMute.unmute().catch(console.error);
        }, 1500);
      }
    }
  }, [isNative, recognitionMode, isOnline]);

  useEffect(() => {
    return () => {
      if (isNative) {
        if (unmuteTimeoutRef.current) {
          clearTimeout(unmuteTimeoutRef.current);
        }
        AudioMute.unmute().catch(console.error);
      }
    };
  }, [isNative]);

  // Keep-alive check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isListening && !activeEngine && !modelLoading) {
        addToLog('🛠️ محاولة استعادة المحرك...');
        // This will trigger the Engine Switching Logic useEffect
        setIsOnline(navigator.onLine);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isListening, activeEngine, modelLoading]);

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
      setInterimTranscript('');
      setTranscript('');
      lastProcessedTextRef.current = '';
      sessionCountsRef.current = {};
      lastResultsLengthRef.current = 0;
      
      if (wakeLockRef.current) {
        try { await wakeLockRef.current.release(); } catch (e) {}
        wakeLockRef.current = null;
      }
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      // Check native permissions if on mobile
      if (isNative) {
        try {
          // On Android/iOS, we need to ensure microphone permission is granted
          // navigator.mediaDevices.getUserMedia will trigger the native prompt
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('Native permission error:', err);
          setShowPermissionError(true);
          return;
        }
      }

      // Try to acquire wake lock
      if ('wakeLock' in navigator) {
        try {
          // Check if permissions API is available to query wake lock
          let canRequest = true;
          if ((navigator as any).permissions) {
            try {
              const status = await (navigator as any).permissions.query({ name: 'screen-wake-lock' });
              if (status.state === 'denied') canRequest = false;
            } catch (e) {
              // Permission query not supported for this name, proceed to try-catch request
            }
          }

          if (canRequest) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            addToLog('💡 تم تفعيل وضع منع انطفاء الشاشة');
          }
        } catch (err: any) {
          // Only log to console if it's not a policy error (which is expected in some iframes)
          if (err.name !== 'NotAllowedError' && !err.message.includes('permissions policy')) {
            console.error('Wake Lock failed:', err);
          } else {
            addToLog('⚠️ منع انطفاء الشاشة غير متاح في هذا المتصفح');
          }
        }
      }

      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

      // Check if we need Vosk and if it's ready
      const willUseVosk = recognitionMode === 'vosk' || (recognitionMode === 'auto' && !isOnline);
      if (willUseVosk && !modelReady) {
        setShowVoskPrompt(true);
      } else {
        startListening();
        setTranscript('');
        setInterimTranscript('');
        lastProcessedTextRef.current = '';
        sessionCountsRef.current = {};
        lastResultsLengthRef.current = 0;
      }
    }
  };

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

  const handleResetSingle = (id: string) => {
    setDhikrs(prev => prev.map(d => d.id === id ? { ...d, count: 0 } : d));
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const deleteDhikr = (id: string) => {
    setDhikrs(prev => prev.filter(d => d.id !== id));
  };

  const startAddDhikr = () => {
    setIsAddingNew(true);
    setEditingSource('settings');
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
    setEditingSource(null);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans flex flex-col p-6 dir-rtl" dir="rtl">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 mb-6 -mt-6 pt-6 pb-4 -mx-6 px-6 bg-dark-bg/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex-1 flex justify-start relative">
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-11 h-11 bg-card-bg/40 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/5 text-gray-400 hover:bg-white/5 transition-all hover:text-white text-[11px] font-bold"
          >
            المزيد
          </button>
          
          <AnimatePresence>
            {showMoreMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMoreMenu(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-14 right-0 w-48 bg-card-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex flex-col py-2">
                    <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors text-right w-full">
                      <Heart size={16} className="text-red-400" />
                      <span>إدعمنا</span>
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors text-right w-full">
                      <LayoutGrid size={16} className="text-blue-400" />
                      <span>مشاريعنا</span>
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors text-right w-full">
                      <Info size={16} className="text-green-400" />
                      <span>من نحن</span>
                    </button>
                    <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors text-right w-full">
                      <Wrench size={16} className="text-gold" />
                      <span>الدعم والتطوير</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
        <div className="bg-card-bg/40 px-6 h-11 flex items-center justify-center rounded-xl border border-white/5 backdrop-blur-md shadow-lg">
          <h1 className="text-gold text-xs font-bold tracking-tight text-center leading-tight">
            المسبحة الصوتية الذكية
          </h1>
        </div>

        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 bg-card-bg/40 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/5 text-gray-400 hover:bg-white/5 transition-all hover:text-white"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-card-bg via-card-bg to-gold/5 rounded-3xl p-6 mb-6 text-center border border-white/10 dhikr-card-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gold/40 rounded-full blur-sm" />
        <p className="text-gray-400 text-sm font-bold mb-3">مجموع التسبيح</p>
        <motion.p 
          key={totalCount}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-5xl font-bold text-gold"
        >
          {formatNumber(totalCount)}
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
                <button 
                  onClick={(e) => { e.stopPropagation(); stopListening(true); stopAllEngines(); }}
                  className="w-full mt-2 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[8px] hover:bg-red-500/30"
                >
                  إيقاف إجباري للمحرك
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext 
          items={dhikrs.map(d => d.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pb-32">
            {dhikrs.map((dhikr) => (
              <SortableDhikrItem 
                key={dhikr.id}
                dhikr={dhikr}
                handleIncrement={handleIncrement}
                handleResetSingle={handleResetSingle}
                setIsAddingNew={setIsAddingNew}
                setEditingSource={setEditingSource}
                setEditingDhikr={setEditingDhikr}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <DhikrCard 
              dhikr={dhikrs.find(d => d.id === activeId)} 
              isOverlay 
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="fixed bottom-0 left-0 right-0 p-8 pb-16 flex justify-between items-center bg-gradient-to-t from-dark-bg via-dark-bg/90 to-transparent z-40 pointer-events-none">
        <button 
          onClick={() => setShowCustomization(true)}
          className="pointer-events-auto w-14 h-14 bg-card-bg rounded-2xl flex items-center justify-center border border-white/10 text-gray-400 hover:text-white transition-all"
          title="تخصيص الأذكار"
        >
          <Edit3 size={24} />
        </button>

        <div className="relative pointer-events-auto">
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
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <Loader2 className="text-white animate-spin mb-1" size={24} />
                <span className="text-[10px] font-bold text-white">{formatNumber(modelProgress)}%</span>
                <div className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300" style={{ width: `${modelProgress}%` }} />
              </div>
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
          <p className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-400 flex items-center gap-2">
            {isListening ? (
              <>
                <span>جاري الاستماع</span>
                {recognitionMode === 'auto' ? (
                  <Zap size={14} className="text-gold" />
                ) : activeEngine === 'google' ? (
                  <Wifi size={14} className="text-gold" />
                ) : (
                  <WifiOff size={14} className="text-gold" />
                )}
              </>
            ) : modelLoading ? (
              <span className="text-gold animate-pulse">جاري التحميل...</span>
            ) : (
              'اضغط للتسبيح بالصوت'
            )}
          </p>
        </div>

        <button 
          onClick={() => setShowResetConfirm(true)}
          className="pointer-events-auto w-14 h-14 bg-card-bg rounded-2xl flex items-center justify-center border border-white/10"
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
                <h2 className="text-xl font-bold">الإعدادات العامة</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Recognition Mode Settings */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Zap size={18} className="text-gold" />
                    محرك التعرف على الصوت
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'auto', label: 'تلقائي (ذكي)', icon: Zap, desc: 'يستخدم محرك الإنترنت عند توفره، والمحرك المحلي عند انقطاعه' },
                      { id: 'google', label: 'بإنترنت', icon: Wifi, desc: 'دقة عالية جداً، يحتاج إنترنت مستمر' },
                      { id: 'vosk', label: 'بدون إنترنت (تحت الصيانة)', icon: WifiOff, desc: 'يعمل بدون إنترنت تماماً، يحتاج تحميل موديل' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setRecognitionMode(mode.id as RecognitionMode)}
                        disabled={mode.id === 'vosk' && !developerMode}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-right ${
                          (mode.id === 'vosk' && !developerMode)
                            ? 'opacity-50 cursor-not-allowed bg-gray-800 border-transparent text-gray-500'
                            : recognitionMode === mode.id 
                              ? 'bg-gold/10 border-gold text-gold' 
                              : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <mode.icon size={20} className="mt-1 shrink-0" />
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs opacity-60">{mode.desc}</div>
                        </div>
                        {recognitionMode === mode.id && <Check size={16} className="mr-auto mt-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibration Toggle */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
                      <Volume2 className="text-gold" size={20} />
                    </div>
                    <div>
                      <p className="font-medium">الاهتزاز عند العد</p>
                      <p className="text-xs text-gray-500">تفعيل اهتزاز الهاتف عند رصد تسبيحة</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setVibrationEnabled(!vibrationEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${vibrationEnabled ? 'bg-gold' : 'bg-gray-700'}`}
                  >
                    <motion.div 
                      animate={{ x: vibrationEnabled ? 24 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {/* Developer Mode Toggle */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
                      <Eye className="text-gold" size={20} />
                    </div>
                    <div>
                      <p className="font-medium">وضع المطور</p>
                      <p className="text-xs text-gray-500">إظهار أدوات التشخيص وسجل الأحداث</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setDeveloperMode(!developerMode);
                      if (developerMode) {
                        setShowDebug(false);
                        if (recognitionMode === 'vosk') {
                          setRecognitionMode('auto');
                        }
                      } else {
                        setShowDebug(true);
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${developerMode ? 'bg-gold' : 'bg-gray-700'}`}
                  >
                    <motion.div 
                      animate={{ x: developerMode ? 24 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCustomization && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomization(false)}
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
                <button onClick={() => setShowCustomization(false)} className="p-2 bg-white/5 rounded-full">
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
                        <p className="text-xs text-gray-500">الهدف: {formatNumber(dhikr.target)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setIsAddingNew(false); setEditingSource('settings'); setEditingDhikr(dhikr); }} className="p-2 text-gray-400 hover:text-white">
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
              <button onClick={() => { setDhikrs(INITIAL_DHIKRS); setShowCustomization(false); }} className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-white">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setEditingDhikr(null); setIsAddingNew(false); setEditingSource(null); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card-bg p-8 rounded-[32px] w-full max-w-md relative z-10 border border-white/10">
              <h3 className="text-xl font-bold mb-6 text-center">{isAddingNew ? 'إضافة ذكر جديد' : 'تعديل الذكر'}</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">النص (مثال: سبحان الله)</label>
                  <input type="text" placeholder="اكتب الذكر هنا..." value={editingDhikr.text} onChange={(e) => setEditingDhikr({...editingDhikr, text: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-lg focus:outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-2">الهدف</label>
                  <input type="tel" dir="ltr" value={editingDhikr.target || ''} onChange={(e) => setEditingDhikr({...editingDhikr, target: Math.min(99999999, parseArabicNumbers(e.target.value))})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-lg focus:outline-none focus:border-gold font-sans" />
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
                  <button onClick={() => { setEditingDhikr(null); setIsAddingNew(false); setEditingSource(null); }} className="flex-1 bg-white/5 font-bold py-4 rounded-2xl">إلغاء</button>
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
        {showVoskPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card-bg border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center space-y-6"
            >
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto">
                <WifiOff className="text-gold" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">تحميل محرك الأوفلاين</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  لتتمكن من التسبيح بدون إنترنت، يحتاج التطبيق لتحميل موديل اللغة العربية (حوالي 50 ميجابايت). سيتم التحميل لمرة واحدة فقط.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowVoskPrompt(false);
                    initVoskModel();
                    startListening();
                  }}
                  className="w-full py-3 bg-gold text-dark-bg font-bold rounded-xl hover:bg-gold/90 transition-colors"
                >
                  موافق، ابدأ التحميل
                </button>
                <button
                  onClick={() => setShowVoskPrompt(false)}
                  className="w-full py-3 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                  إلغاء
                </button>
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
