import { useState } from 'react';
import { X, Layers, Loader2, CheckCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { generateScript } from '../services/api.js';

const CATEGORIES = [
  { id: 'cooking',    label: 'Cooking',     emoji: '🍳' },
  { id: 'motivation', label: 'Motivation',  emoji: '🔥' },
  { id: 'business',   label: 'Business',    emoji: '💼' },
  { id: 'tech',       label: 'Technology',  emoji: '🤖' },
  { id: 'health',     label: 'Health',      emoji: '💪' },
  { id: 'travel',     label: 'Travel',      emoji: '✈️' },
  { id: 'finance',    label: 'Finance',     emoji: '💰' },
  { id: 'education',  label: 'Education',   emoji: '📚' },
];

const TOPICS_BY_CATEGORY = {
  cooking:    ['Quick Healthy Breakfast Ideas','5 Minute Dinner Recipes','Budget Meal Prep Guide','Traditional Street Food Secrets','High Protein Meals for Gym'],
  motivation: ['Never Give Up — Your Comeback Story','Morning Habits of Successful People','How to Stay Focused Every Day','Overcome Fear and Take Action','Build Unstoppable Confidence'],
  business:   ['How to Start a Business with No Money','5 Skills That Make You Rich','Side Hustles That Actually Work','How to Get Your First Client','Build Passive Income in 2025'],
  tech:       ['Top 5 AI Tools of 2025','How to Use ChatGPT to Make Money','Beginner Guide to Coding','Best Free Apps You Need Now','How AI is Changing Jobs'],
  health:     ['10 Min Morning Workout at Home','Eat Healthy on a Budget','Fix Your Sleep in 7 Days','Mental Health Tips for Stress','Lose Weight Without Gym'],
  travel:     ['Budget Travel Tips That Work','Hidden Places Nobody Visits','How to Travel for Free','Best Street Food Around the World','Cheapest Countries to Visit'],
  finance:    ['Save Money Fast — Simple Tricks','How to Invest with ₹1000','Get Out of Debt Quickly','Build an Emergency Fund','Stocks for Complete Beginners'],
  education:  ['Learn Anything Fast — Study Tips','Top Free Learning Websites','How to Remember Everything','Speed Reading in 5 Minutes','Online Courses Worth Taking'],
};

const STYLES = ['professional','educational','social','motivational','cinematic','documentary'];

export default function BulkGenerator({ onScriptsReady, onClose }) {
  const [category, setCategory] = useState('motivation');
  const [count,    setCount]    = useState(3);
  const [style,    setStyle]    = useState('motivational');
  const [duration, setDuration] = useState(45);
  const [status,   setStatus]   = useState('idle'); // idle | running | done
  const [scripts,  setScripts]  = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [expanded, setExpanded] = useState(null);
  const [error,    setError]    = useState('');

  const handleGenerate = async () => {
    setStatus('running'); setError(''); setScripts([]);
    const topics = [...(TOPICS_BY_CATEGORY[category] || [])];
    // shuffle and pick `count` topics
    const shuffled = topics.sort(() => Math.random() - 0.5).slice(0, count);
    const results = [];
    for (let i = 0; i < shuffled.length; i++) {
      const topic = shuffled[i];
      setProgress({ done: i, total: shuffled.length, current: topic });
      try {
        const script = await generateScript({ topic, style, duration, tone: 'engaging', audience: 'general', language: 'English' });
        results.push({ topic, script, status: 'done' });
      } catch (e) {
        results.push({ topic, script: null, status: 'error', error: e.message });
      }
      setScripts([...results]);
    }
    setProgress({ done: shuffled.length, total: shuffled.length, current: '' });
    setStatus('done');
  };

  const downloadScript = (item) => {
    const json = JSON.stringify(item.script, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${item.topic.substring(0, 30).replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Bulk Generator</h3>
              <p className="text-xs text-white/40">Generate multiple scripts at once</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'idle' && (
          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="text-xs text-white/50 mb-2 block font-medium">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                      category === c.id ? 'bg-brand-500/20 border-brand-500/40 text-white' : 'glass border-white/10 text-white/50 hover:text-white'
                    }`}>
                    <span className="text-base">{c.emoji}</span>
                    <span className="text-[9px] font-medium">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/50 font-medium">Number of Videos</label>
                <span className="text-sm font-bold text-brand-400">{count}</span>
              </div>
              <input type="range" min={2} max={5} step={1} value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full accent-brand-500 h-2" />
              <div className="flex justify-between text-[10px] text-white/25 mt-1">
                <span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            {/* Style + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block font-medium">Style</label>
                <select value={style} onChange={e => setStyle(e.target.value)}
                  className="input-field text-sm w-full">
                  {STYLES.map(s => <option key={s} value={s} className="bg-gray-900 capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block font-medium">Duration</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                  className="input-field text-sm w-full">
                  {[30,45,60,90,120].map(d => <option key={d} value={d} className="bg-gray-900">{d}s</option>)}
                </select>
              </div>
            </div>

            <div className="glass rounded-xl p-3 text-xs text-white/40 space-y-1">
              <p>📋 Will generate <span className="text-white font-medium">{count} scripts</span> on {CATEGORIES.find(c=>c.id===category)?.label} topics</p>
              <p>⏱️ Takes ~{count * 10}–{count * 20} seconds total</p>
              <p>💰 Cost: ~${(count * 0.002).toFixed(3)} (Gemini free = $0)</p>
            </div>

            <button onClick={handleGenerate}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              <Layers className="w-4 h-4" /> Generate {count} Scripts
            </button>
          </div>
        )}

        {status === 'running' && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <Loader2 className="w-10 h-10 animate-spin text-brand-400 mx-auto" />
              <p className="text-sm font-semibold">Generating {progress.done + 1} of {progress.total}…</p>
              <p className="text-xs text-white/40 px-4 text-center">{progress.current}</p>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            {/* Show completed scripts so far */}
            {scripts.map((item, i) => (
              <div key={i} className="flex items-center gap-2 glass p-2.5 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-white/60 truncate flex-1">{item.topic}</p>
              </div>
            ))}
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-semibold">{scripts.filter(s=>s.status==='done').length} scripts ready!</p>
            </div>
            {scripts.map((item, i) => (
              <div key={i} className="glass rounded-xl overflow-hidden border border-white/5">
                <button onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between gap-2 p-3 hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.status === 'done'
                      ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <X className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <p className="text-xs text-white truncate">{item.script?.title || item.topic}</p>
                  </div>
                  {expanded === i ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                </button>
                {expanded === i && item.script && (
                  <div className="px-3 pb-3 space-y-2 border-t border-white/5">
                    <p className="text-[10px] text-white/40 mt-2">{item.script.scenes?.length} scenes · {item.script.totalDuration}s</p>
                    <div className="flex gap-2">
                      <button onClick={() => { onScriptsReady(item.script); onClose(); }}
                        className="flex-1 py-2 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-medium hover:bg-brand-500/30 transition-all">
                        Open in Editor
                      </button>
                      <button onClick={() => downloadScript(item)}
                        className="flex items-center gap-1 py-2 px-3 rounded-xl glass glass-hover text-xs text-white/50">
                        <Download className="w-3 h-3" /> JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => { setStatus('idle'); setScripts([]); }}
              className="btn-secondary w-full text-sm">Generate More</button>
          </div>
        )}
      </div>
    </div>
  );
}
