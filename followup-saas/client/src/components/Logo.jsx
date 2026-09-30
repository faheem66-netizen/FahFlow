export default function Logo({ withBadge = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/20 text-white">
        F
      </div>
      <span className="text-xl font-bold tracking-tight text-white">Fahflow</span>
      {withBadge && (
        <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
          SaaS
        </span>
      )}
    </div>
  );
}
