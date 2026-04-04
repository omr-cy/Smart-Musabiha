import React, { useState, useEffect } from 'react';
import { Mic, RotateCcw, Volume2 } from 'lucide-react';

const App: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Basic Speech Recognition setup (if supported)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'ar-SA';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        console.log('Transcript:', transcript);
        // If user says "سبحان الله" or "الحمد لله" or "الله أكبر"
        if (transcript.includes('سبحان') || transcript.includes('الحمد') || transcript.includes('أكبر')) {
          setCount(prev => prev + 1);
        }
      };

      if (isListening) {
        recognition.start();
      } else {
        recognition.stop();
      }

      return () => recognition.stop();
    }
  }, [isListening]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-emerald-400">المسبحة الصوتية الذكية</h1>
      
      <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-8 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
        <span className="text-7xl font-mono font-bold text-emerald-400">{count}</span>
      </div>

      <div className="mt-12 flex gap-6">
        <button 
          onClick={() => setIsListening(!isListening)}
          className={`p-6 rounded-full transition-all ${isListening ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
        >
          <Mic size={32} />
        </button>

        <button 
          onClick={() => setCount(0)}
          className="p-6 rounded-full bg-slate-700 hover:bg-slate-600 transition-all"
        >
          <RotateCcw size={32} />
        </button>
      </div>

      <p className="mt-8 text-slate-400 text-center max-w-xs">
        {isListening ? 'جاري الاستماع للأذكار...' : 'اضغط على الميكروفون للبدء بالعد الصوتي'}
      </p>
      
      <div className="mt-4 flex items-center gap-2 text-emerald-400/60 text-sm">
        <Volume2 size={16} />
        <span>سبحان الله، الحمد لله، الله أكبر</span>
      </div>
    </div>
  );
};

export default App;
