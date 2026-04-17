import { RefreshCw, Edit3, Trash2, GripVertical } from 'lucide-react';

export default function SceneCard({ scene, index, isActive, isRegenerating, onClick, onRegenerate, onEdit, onDelete }) {
  return (
    <div
      className={`scene-card group relative ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
            ${isActive ? 'bg-brand-500/30 text-brand-300' : 'bg-white/10 text-white/50'}`}>
            {index + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{scene.emoji || '🎬'}</span>
            <h4 className="text-sm font-semibold text-white truncate">{scene.title}</h4>
          </div>
          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{scene.narration}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-white/30">{scene.duration}s</span>
            {scene.keyPoints?.length > 0 && (
              <span className="text-xs text-white/30">{scene.keyPoints.length} points</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              scene.transition === 'fade' ? 'bg-blue-500/20 text-blue-400' :
              scene.transition === 'zoom' ? 'bg-purple-500/20 text-purple-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {scene.transition || 'fade'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            title="Regenerate scene"
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-brand-500/20 flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/50 hover:text-brand-400 ${isRegenerating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onEdit}
            title="Edit scene"
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
      </div>

      {isRegenerating && (
        <div className="absolute inset-0 rounded-xl bg-dark-900/70 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-brand-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Regenerating...
          </div>
        </div>
      )}
    </div>
  );
}
