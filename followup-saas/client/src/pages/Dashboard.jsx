import { useEffect, useState } from 'react';
import Logo from '../components/Logo.jsx';
import api from '../api.js';
import { signOutUser } from '../firebase.js';
import ThreadLog from '../components/ThreadLog.jsx';
import NewThreadModal from '../components/NewThreadModal.jsx';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Settings (Templates & Delay) form state
  const [delaysText, setDelaysText] = useState('');
  const [template, setTemplate] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  async function loadUser() {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    setDelaysText((data.user.followUpDefaults?.delaysDays || []).join(', '));
    setTemplate(data.user.followUpDefaults?.messageTemplate || '');
  }

  async function loadThreads() {
    const { data } = await api.get('/threads');
    setThreads(data.threads);
  }

  useEffect(() => {
    loadUser();
    loadThreads();
  }, []);

  async function connectGmail() {
    const { data } = await api.get('/gmail/connect');
    window.location.href = data.url;
  }

  async function disconnectGmail() {
    await api.post('/gmail/disconnect');
    loadUser();
  }

  async function createThread(payload) {
    if (!user?.gmailConnected) {
      return 'Connect your Gmail account before tracking a thread.';
    }
    try {
      await api.post('/threads', payload);
      setModalOpen(false);
      loadThreads();
      return null;
    } catch (err) {
      return err.response?.data?.error || 'Could not add thread';
    }
  }

  async function pause(id) { await api.patch(`/threads/${id}/pause`); loadThreads(); }
  async function resume(id) { await api.patch(`/threads/${id}/resume`); loadThreads(); }
  async function remove(id) { await api.delete(`/threads/${id}`); loadThreads(); }

  async function logout() {
    await signOutUser();
    window.location.href = '/login';
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSettingsError('');
    setSettingsSaved(false);

    const delaysDays = delaysText
      .split(',')
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!delaysDays.length) {
      setSettingsError('Enter at least one valid number of days, separated by commas');
      return;
    }

    setSavingSettings(true);
    try {
      const { data } = await api.patch('/auth/settings', { delaysDays, messageTemplate: template });
      setUser(data.user);
      setSettingsSaved(true);
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Could not save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  if (!user) return null;

  const followUpsSent = threads.reduce((sum, t) => sum + (t.currentStep || 0), 0);
  const repliesStopped = threads.filter((t) => t.status === 'REPLY_RECEIVED').length;
  const activeThreads = threads.filter((t) => t.status === 'ACTIVE').length;
  const replyRate = threads.length ? Math.round((repliesStopped / threads.length) * 100) : 0;

  const navLink = 'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition';

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800/80">
            <Logo withBadge />
          </div>

          <nav className="p-4 space-y-1">
            <a href="#dashboard" className={`${navLink} bg-indigo-600/10 text-indigo-400 border border-indigo-500/20`}>
              <span>📊</span> Dashboard
            </a>
            <a href="#threads" className={`${navLink} text-slate-400 hover:bg-slate-800/50 hover:text-slate-200`}>
              <span>✉️</span> Tracked Threads
            </a>
            <a href="#settings" className={`${navLink} text-slate-400 hover:bg-slate-800/50 hover:text-slate-200`}>
              <span>⚙️</span> Templates &amp; Delay
            </a>
          </nav>
        </div>

        <div className="p-4 m-4 rounded-2xl bg-slate-800/40 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${user.gmailConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-semibold text-slate-300">
              {user.gmailConnected ? 'Gmail Connected' : 'Gmail Not Connected'}
            </span>
          </div>
          {user.gmailConnected && <p className="text-[11px] text-slate-400 truncate mb-3">{user.gmailEmailAddress}</p>}
          {user.gmailConnected ? (
            <button onClick={disconnectGmail} className="text-[11px] text-red-400 hover:text-red-300 font-medium transition">
              Disconnect Gmail
            </button>
          ) : (
            <button onClick={connectGmail} className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition">
              Connect Gmail →
            </button>
          )}
          <button onClick={logout} className="block mt-3 text-[11px] text-slate-500 hover:text-slate-300 font-medium transition">
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
        <header id="dashboard" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 scroll-mt-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
            <p className="text-sm text-slate-400 mt-1">Automated follow-ups running via your connected Gmail account.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 transition"
          >
            + Track New Lead Thread
          </button>
        </header>

        {/* METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Threads</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{activeThreads}</span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">Live</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Follow-ups Sent</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{followUpsSent}</span>
              <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">Total</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Replies Stopped</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-emerald-400">{repliesStopped}</span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">{replyRate}% Rate</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Automation Check</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-200">Every 5 min</span>
              <span className="text-xs font-medium text-indigo-400">Active</span>
            </div>
          </div>
        </section>

        {/* THREADS TABLE */}
        <section id="threads" className="scroll-mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Active Follow-up Sequences</h2>
              <p className="text-xs text-slate-400 mt-1">A fresh Gmail check runs before every send — replies stop the sequence instantly.</p>
            </div>
          </div>
          <ThreadLog threads={threads} onPause={pause} onResume={resume} onDelete={remove} />
        </section>

        {/* TEMPLATES & DELAY SETTINGS */}
        <section id="settings" className="scroll-mt-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-white">Default Follow-up Template</h2>
              <p className="text-xs text-slate-400 mt-1">
                Pre-fills every new thread you track — you can still override the wording per thread when you add it.
              </p>
            </div>

            {settingsError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{settingsError}</div>
            )}
            {settingsSaved && <div className="text-emerald-400 text-sm">Saved.</div>}

            <form onSubmit={saveSettings} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Follow-up sequence (days between each message)
                </label>
                <input
                  value={delaysText}
                  onChange={(e) => setDelaysText(e.target.value)}
                  placeholder="3, 5, 7, 15, 20"
                  className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Message text (use {'{{step}}'} for the follow-up number)
                </label>
                <textarea
                  rows={7}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-60"
              >
                {savingSettings ? 'Saving…' : 'Save default template'}
              </button>
            </form>
          </div>
        </section>
      </main>

      {modalOpen && (
        <NewThreadModal
          defaults={user.followUpDefaults}
          onClose={() => setModalOpen(false)}
          onCreate={createThread}
        />
      )}
    </div>
  );
}
