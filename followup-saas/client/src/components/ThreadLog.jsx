const STATUS_STYLES = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REPLY_RECEIVED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_LABELS = {
  ACTIVE: 'Active',
  REPLY_RECEIVED: 'Replied',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
};

export default function ThreadLog({ threads, onPause, onResume, onDelete }) {
  if (!threads.length) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center">
        <div className="text-3xl mb-2">📭</div>
        <div className="font-semibold text-slate-200 mb-1">No threads yet</div>
        <div className="text-sm text-slate-400">Click "Track New Lead Thread" above to start your first follow-up sequence.</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="p-4">Recipient Email</th>
              <th className="p-4">Subject Line</th>
              <th className="p-4">Current Step</th>
              <th className="p-4">Next Due</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {threads.map((t) => (
              <tr key={t._id} className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-medium text-white">{t.recipientEmail}</td>
                <td className="p-4 text-slate-300">{t.subject || '(no subject)'}</td>
                <td className="p-4 text-indigo-400 font-medium">
                  {t.status === 'COMPLETED' || t.status === 'REPLY_RECEIVED' ? 'Stopped' : `Step ${t.currentStep}`}
                </td>
                <td className="p-4 text-slate-400">
                  {t.nextFollowUpAt ? new Date(t.nextFollowUpAt).toLocaleString() : '—'}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  {t.status === 'ACTIVE' && (
                    <button onClick={() => onPause(t._id)} className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                      Pause
                    </button>
                  )}
                  {(t.status === 'PAUSED' || t.status === 'REPLY_RECEIVED') && (
                    <button onClick={() => onResume(t._id)} className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                      Resume
                    </button>
                  )}
                  <button onClick={() => onDelete(t._id)} className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
