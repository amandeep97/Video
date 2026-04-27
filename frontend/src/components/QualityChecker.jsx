import { useState } from 'react';
import { X, ShieldCheck, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { callAI } from '../services/api.js';

export default function QualityChecker({ script, onClose }) {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleCheck = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const prompt = `Analyze this video script and give a quality score with specific feedback.

Script:
Title: "${script.title}"
Duration: ${script.totalDuration}s
Style: ${script.style}
Scenes: ${script.scenes.length}
Scene details:
${script.scenes.map((s, i) => `Scene ${i+1}: "${s.title}" - ${s.narration?.substring(0, 100)}...`).join('\n')}
Call to Action: "${script.callToAction}"

Evaluate these criteria and respond ONLY with valid JSON, no markdown:
{
  "score": 8.5,
  "grade": "A",
  "summary": "one sentence overall verdict",
  "checks": [
    { "name": "Hook Strength", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Scene Flow", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Narration Quality", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Duration", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Call to Action", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Engagement", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Title Appeal", "status": "pass|warn|fail", "message": "specific feedback" },
    { "name": "Content Value", "status": "pass|warn|fail", "message": "specific feedback" }
  ],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}`;

      const content = await callAI('You are a video content quality analyst. Return only valid JSON.', prompt, 1024);
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse result');
      setResult(JSON.parse(match[0]));
    } catch (e) {
      setError(e.message || 'Failed to check quality. Make sure you have a script generated.');
    }
    setLoading(false);
  };

  const scoreColor = (score) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const StatusIcon = ({ status }) => {
    if (status === 'pass') return <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />;
    if (status === 'warn') return <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Quality Checker</h3>
              <p className="text-xs text-white/40">AI reviews your video before export</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!result && !loading && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2">
              <p className="text-sm text-white/70">Checking: <span className="text-white font-medium">"{script.title}"</span></p>
              <div className="flex gap-4 text-xs text-white/40">
                <span>{script.scenes?.length} scenes</span>
                <span>{script.totalDuration}s</span>
                <span className="capitalize">{script.style}</span>
              </div>
            </div>
            <button onClick={handleCheck}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-purple-400 transition-all">
              <ShieldCheck className="w-4 h-4" /> Check Video Quality
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
            <p className="text-sm text-white/60">Analyzing your video script…</p>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <p className="text-xs text-red-400 text-center">{error}</p>
            <button onClick={() => setError('')} className="btn-secondary w-full text-sm">Try Again</button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center justify-between p-4 glass rounded-xl">
              <div>
                <p className="text-xs text-white/40 mb-1">Quality Score</p>
                <p className={`text-4xl font-black ${scoreColor(result.score)}`}>{result.score}<span className="text-lg text-white/30">/10</span></p>
                <p className="text-xs text-white/50 mt-1">{result.summary}</p>
              </div>
              <div className={`text-5xl font-black ${scoreColor(result.score)} opacity-20`}>{result.grade}</div>
            </div>

            {/* Checks */}
            <div className="space-y-2">
              {result.checks?.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl">
                  <StatusIcon status={c.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">{c.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{c.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Improvements */}
            {result.improvements?.length > 0 && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-blue-300">💡 Improvements</p>
                {result.improvements.map((imp, i) => (
                  <p key={i} className="text-xs text-white/60">→ {imp}</p>
                ))}
              </div>
            )}

            <button onClick={() => setResult(null)} className="btn-secondary w-full text-sm">Check Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
