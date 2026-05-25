export function HowTo({ steps, when }) {
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">💡</span>
        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">How to use</span>
      </div>
      {when && (
        <p className="text-xs text-white/40 mb-3">
          <span className="text-white/60 font-semibold">Use when:</span> {when}
        </p>
      )}
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/55">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] mt-0.5">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
