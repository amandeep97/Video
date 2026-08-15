import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Library as LibraryIcon, Flame, Trash2, ChevronDown, ChevronUp,
  Scissors, Send, CheckCircle2, Radar, Circle,
} from 'lucide-react';
import KitDetail from '../components/KitDetail.jsx';
import { getKits, setStatus, deleteKit, getStats, STATUS } from '../services/kits.js';

const FILTERS = [
  { id: 'todo',   label: 'To make', icon: Circle },
  { id: 'made',   label: 'Made',    icon: Scissors },
  { id: 'posted', label: 'Posted',  icon: CheckCircle2 },
  { id: 'all',    label: 'All',     icon: LibraryIcon },
];

const STATUS_STYLE = {
  todo:   'border-white/10 bg-white/5 text-white/50',
  made:   'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  posted: 'border-green-500/30 bg-green-500/10 text-green-300',
};

function when(ts) {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function KitCard({ rec, onChange }) {
  const [open, setOpen] = useState(false);

  const move = (status) => { setStatus(rec.id, status); onChange(); };
  const remove = () => { deleteKit(rec.id); onChange(); };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-snug">{rec.song}</p>
            <p className="text-xs text-white/35 mt-0.5">
              {rec.kit?.mood ? `${rec.kit.mood} · ` : ''}saved {when(rec.createdAt)}
              {rec.postedAt ? ` · posted ${when(rec.postedAt)}` : ''}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${STATUS_STYLE[rec.status]}`}>
            {rec.status === 'todo' ? 'To make' : rec.status === 'made' ? 'Made' : 'Posted'}
          </span>
        </div>

        {rec.kit?.angle && <p className="text-xs text-white/50 leading-snug">{rec.kit.angle}</p>}

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {rec.status === STATUS.TODO && (
            <button onClick={() => move(STATUS.MADE)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-all flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" /> Mark made
            </button>
          )}
          {rec.status === STATUS.MADE && (
            <button onClick={() => move(STATUS.POSTED)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 hover:bg-green-500/25 transition-all flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Mark posted
            </button>
          )}
          {rec.status === STATUS.POSTED && (
            <button onClick={() => move(STATUS.TODO)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
              Undo
            </button>
          )}
          <button onClick={() => setOpen(o => !o)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all flex items-center gap-1.5">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {open ? 'Hide kit' : 'Open kit'}
          </button>
          <button onClick={remove} title="Delete"
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all ml-auto">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 p-3">
          <KitDetail kit={rec.kit} />
        </div>
      )}
    </div>
  );
}

export default function Library() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todo');
  const [, setTick] = useState(0);               // bump to re-read localStorage
  const refresh = () => setTick(t => t + 1);

  const kits = getKits();
  const stats = getStats();
  const shown = filter === 'all' ? kits : kits.filter(k => k.status === filter);

  return (
    <div className="min-h-screen bg-dark-950 bg-grid">
      <nav className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <LibraryIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-white">My Content</span>
          </div>
          <button onClick={() => navigate('/producer')}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 transition-all flex items-center gap-1.5">
            <Radar className="w-3.5 h-3.5" /> New
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Streak */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${stats.streak > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-white/10'}`}>
              <Flame className={`w-6 h-6 ${stats.streak > 0 ? 'text-white' : 'text-white/30'}`} />
            </div>
            <div className="flex-1">
              <p className="text-lg font-black text-white leading-tight">
                {stats.streak > 0 ? `${stats.streak} day streak` : 'No streak yet'}
              </p>
              <p className="text-xs text-white/40">
                {stats.postedToday
                  ? 'Posted today — keep it going tomorrow.'
                  : stats.streak > 0
                    ? 'Post today to keep the streak alive.'
                    : 'Post your first reel to start the streak.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'To make', value: stats.todo },
              { label: 'Made', value: stats.made },
              { label: 'Posted', value: stats.posted },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-black/20 border border-white/5 p-2 text-center">
                <p className="text-lg font-black text-white leading-none">{s.value}</p>
                <p className="text-[10px] text-white/35 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          {FILTERS.map(f => {
            const Icon = f.icon;
            const count = f.id === 'all' ? kits.length : kits.filter(k => k.status === f.id).length;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${filter === f.id ? 'bg-brand-500/20 border-brand-500/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{f.label}</span>
                <span className="opacity-50">{count}</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {shown.length === 0 ? (
          <div className="text-center py-14 space-y-3">
            <p className="text-sm text-white/40">
              {kits.length === 0
                ? 'No kits saved yet. Generate one in AI Producer and save it here.'
                : `Nothing in "${FILTERS.find(f => f.id === filter)?.label}".`}
            </p>
            {kits.length === 0 && (
              <button onClick={() => navigate('/producer')} className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
                <Radar className="w-4 h-4" /> Open AI Producer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(rec => <KitCard key={rec.id} rec={rec} onChange={refresh} />)}
          </div>
        )}
      </div>
    </div>
  );
}
