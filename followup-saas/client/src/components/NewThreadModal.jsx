import { useState } from 'react';

export default function NewThreadModal({ defaults, onClose, onCreate }) {
  const [gmailThreadId, setGmailThreadId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [delaysText, setDelaysText] = useState((defaults?.delaysDays || [3, 5, 7, 15, 20]).join(', '));
  const [message, setMessage] = useState(defaults?.messageTemplate || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const delaysDays = delaysText
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!delaysDays.length) {
      setError('Enter at least one valid number of days, separated by commas (e.g. 3, 5, 7, 15, 20)');
      return;
    }
    if (!message.trim()) {
      setError('Write the follow-up message that should be sent');
      return;
    }

    setSaving(true);
    const errMsg = await onCreate({
      gmailThreadId: gmailThreadId.trim(),
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim(),
      delaysDays,
      messageTemplate: message,
    });
    setSaving(false);
    if (errMsg) setError(errMsg);
  }

  const inputClass =
    'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500';
  const labelClass = 'block text-xs font-semibold text-slate-300 mb-1.5';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">Track New Lead Thread</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl leading-none">&times;</button>
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Gmail thread ID</label>
            <input className={inputClass} value={gmailThreadId} onChange={(e) => setGmailThreadId(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Recipient email</label>
              <input type="email" className={inputClass} value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Subject (optional)</label>
              <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Proposal for..." />
            </div>
          </div>

          <div>
            <label className={labelClass}>Follow up after (days), one after another</label>
            <input className={inputClass} value={delaysText} onChange={(e) => setDelaysText(e.target.value)} placeholder="3, 5, 7, 15, 20" />
            <p className="text-[11px] text-slate-500 mt-1.5">
              e.g. "3, 5, 7, 15, 20" sends the 1st follow-up after 3 days, the 2nd 5 days after that, and so on.
            </p>
          </div>

          <div>
            <label className={labelClass}>What should the follow-up say?</label>
            <textarea
              className={inputClass + ' resize-y'}
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, just following up on my previous message..."
            />
            <p className="text-[11px] text-slate-500 mt-1.5">Use {'{{step}}'} to insert the follow-up number (1, 2, 3...).</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-sm text-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-60">
              {saving ? 'Adding…' : 'Start tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
