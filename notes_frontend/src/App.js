import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

/**
 * Ocean Professional Notes App
 * - Sidebar with notes list + search
 * - Main panel for viewing/editing
 * - In-memory store by default with optional backend integration via REACT_APP_API_BASE
 * - Optimistic updates, basic validation, smooth transitions, responsive
 */

const COLORS = {
  primary: '#2563EB',
  secondary: '#F59E0B',
  success: '#F59E0B',
  error: '#EF4444',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
};

// Lightweight API client that no-ops when REACT_APP_API_BASE is not set or not reachable
function createApiClient() {
  const base = process.env.REACT_APP_API_BASE?.replace(/\/+$/, ''); // trim trailing slash
  const enabled = Boolean(base);

  // PUBLIC_INTERFACE
  const isEnabled = () => enabled;

  async function http(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  return {
    isEnabled,
    // PUBLIC_INTERFACE
    async listNotes() {
      if (!enabled) throw new Error('API disabled');
      return http('/notes', { method: 'GET' });
    },
    // PUBLIC_INTERFACE
    async createNote(note) {
      if (!enabled) throw new Error('API disabled');
      return http('/notes', { method: 'POST', body: JSON.stringify(note) });
    },
    // PUBLIC_INTERFACE
    async updateNote(id, note) {
      if (!enabled) throw new Error('API disabled');
      return http(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(note) });
    },
    // PUBLIC_INTERFACE
    async deleteNote(id) {
      if (!enabled) throw new Error('API disabled');
      return http(`/notes/${id}`, { method: 'DELETE' });
    },
  };
}

const api = createApiClient();

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function useLocalNotes(initial = []) {
  const [notes, setNotes] = useState(initial);

  // seed sample notes first run
  useEffect(() => {
    setNotes((prev) => {
      if (prev.length) return prev;
      return [
        {
          id: uid(),
          title: 'Welcome to Notes',
          content:
            'This is your Ocean Professional themed Notes app. Create, edit, and delete notes. Try searching from the left.',
          updatedAt: new Date().toISOString(),
        },
        {
          id: uid(),
          title: 'Pro tip',
          content:
            'If a backend is configured via REACT_APP_API_BASE, the app will sync with it automatically.',
          updatedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  // PUBLIC_INTERFACE
  const create = (data) => {
    const item = {
      id: uid(),
      title: data.title?.trim() || 'Untitled',
      content: data.content?.trim() || '',
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [item, ...prev]);
    return item;
  };

  // PUBLIC_INTERFACE
  const update = (id, data) => {
    let updatedItem = null;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          updatedItem = { ...n, ...data, updatedAt: new Date().toISOString() };
          return updatedItem;
        }
        return n;
      }),
    );
    return updatedItem;
  };

  // PUBLIC_INTERFACE
  const remove = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // PUBLIC_INTERFACE
  const replaceAll = (items) => setNotes(items);

  return { notes, create, update, remove, replaceAll };
}

function Header({ onToggleTheme, theme }) {
  return (
    <div style={styles.header}>
      <div style={styles.headerLeft}>
        <div style={styles.logoCircle} aria-hidden />
        <div>
          <div style={styles.brandTitle}>Notes</div>
          <div style={styles.brandSub}>Ocean Professional</div>
        </div>
      </div>
      <div style={styles.headerRight}>
        <button
          type="button"
          onClick={onToggleTheme}
          style={styles.secondaryBtn}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  notes,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
  search,
  setSearch,
}) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          aria-label="Search notes"
          style={styles.searchInput}
        />
        <button type="button" onClick={onAdd} style={styles.primaryBtn}>
          + New
        </button>
      </div>
      <div style={styles.list}>
        {notes.length === 0 ? (
          <div style={styles.empty}>No notes found</div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              onClick={() => onSelect(n.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(n.id)}
              style={{
                ...styles.listItem,
                ...(selectedId === n.id ? styles.listItemActive : {}),
              }}
            >
              <div style={styles.listItemTitle}>
                {n.title || 'Untitled'}
              </div>
              <div style={styles.listItemMeta}>
                {new Date(n.updatedAt).toLocaleString()}
              </div>
              <button
                title="Delete note"
                aria-label={`Delete ${n.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(n.id);
                }}
                style={styles.iconBtn}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function Editor({ note, onChange, onSave, validation, isSaving }) {
  if (!note) {
    return <div style={styles.emptyPanel}>Select or create a note to begin.</div>;
  }
  return (
    <div style={styles.editor}>
      <div style={styles.field}>
        <label style={styles.label}>Title</label>
        <input
          value={note.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Note title"
          style={{
            ...styles.input,
            ...(validation.title ? styles.inputError : {}),
          }}
          aria-invalid={!!validation.title}
        />
        {validation.title && (
          <div style={styles.errorText}>{validation.title}</div>
        )}
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Content</label>
        <textarea
          value={note.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Start typing..."
          rows={12}
          style={styles.textarea}
        />
      </div>
      <div style={styles.actionsRow}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          style={{
            ...styles.primaryBtn,
            ...(isSaving ? styles.btnDisabled : {}),
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const { notes, create, update, remove, replaceAll } = useLocalNotes();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const mounted = useRef(false);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Try to fetch from backend if API is enabled
  useEffect(() => {
    let cancel = false;
    async function bootstrap() {
      if (!api.isEnabled()) return;
      try {
        const serverNotes = await api.listNotes();
        if (!cancel && Array.isArray(serverNotes)) {
          // Normalize server notes
          const normalized = serverNotes.map((n) => ({
            id: String(n.id ?? n._id ?? uid()),
            title: String(n.title ?? 'Untitled'),
            content: String(n.content ?? ''),
            updatedAt: n.updatedAt || new Date().toISOString(),
          }));
          replaceAll(
            normalized.sort(
              (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
            ),
          );
        }
      } catch (e) {
        // Stay with local store
      }
    }
    bootstrap();
    return () => {
      cancel = true;
    };
  }, [replaceAll]);

  // Keep draft in sync with selected note
  useEffect(() => {
    const n = notes.find((x) => x.id === selectedId) || null;
    setDraft(n ? { ...n } : null);
  }, [selectedId, notes]);

  // Select first note on mount if any
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (notes.length > 0) setSelectedId(notes[0].id);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [notes, search]);

  function showToast(message, variant = 'success') {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 2200);
  }

  function newNote() {
    const created = create({ title: 'Untitled', content: '' });
    setSelectedId(created.id);
    // Attempt backend creation optimistically
    if (api.isEnabled()) {
      api
        .createNote(created)
        .then((saved) => {
          // Reconcile ID if backend generated new id
          if (saved && saved.id && saved.id !== created.id) {
            const newId = String(saved.id);
            update(created.id, { id: newId, updatedAt: saved.updatedAt || new Date().toISOString() });
            setSelectedId(newId);
          }
          showToast('Note created');
        })
        .catch(() => {
          // Rollback locally by removing if failed
          remove(created.id);
          showToast('Failed to sync create', 'error');
        });
    } else {
      showToast('Note created');
    }
  }

  function onDelete(id) {
    const existing = notes.find((n) => n.id === id);
    if (!existing) return;
    remove(id);
    if (selectedId === id) setSelectedId(null);
    if (api.isEnabled()) {
      api
        .deleteNote(id)
        .then(() => showToast('Note deleted'))
        .catch(() => {
          // Restore on failure
          const restored = { ...existing, updatedAt: new Date().toISOString() };
          replaceAll([restored, ...notes.filter((n) => n.id !== id)]);
          showToast('Failed to sync delete', 'error');
        });
    } else {
      showToast('Note deleted');
    }
  }

  function onChangeDraft(patch) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function validate(note) {
    const errors = {};
    if (!note.title || !note.title.trim()) {
      errors.title = 'Title is required';
    } else if (note.title.length > 120) {
      errors.title = 'Title must be at most 120 characters';
    }
    return errors;
  }

  async function onSave() {
    if (!draft) return;
    const errors = validate(draft);
    if (Object.keys(errors).length) {
      setValidation(errors);
      return;
    }
    setValidation({});
    setIsSaving(true);

    // optimistic local save
    const prev = notes.find((n) => n.id === draft.id);
    const updated = update(draft.id, { title: draft.title, content: draft.content });

    if (api.isEnabled()) {
      try {
        await api.updateNote(draft.id, updated);
        showToast('Saved');
      } catch (e) {
        // rollback
        if (prev) update(prev.id, prev);
        showToast('Failed to sync save', 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
      showToast('Saved');
    }
  }

  const [validation, setValidation] = useState({});

  return (
    <div style={styles.app}>
      <div style={styles.gradientBg} aria-hidden />
      <Header
        onToggleTheme={() =>
          setTheme((t) => (t === 'light' ? 'dark' : 'light'))
        }
        theme={theme}
      />
      <div style={styles.shell}>
        <Sidebar
          notes={filteredNotes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={newNote}
          onDelete={onDelete}
          search={search}
          setSearch={setSearch}
        />
        <main style={styles.main}>
          <Editor
            note={draft}
            onChange={onChangeDraft}
            onSave={onSave}
            validation={validation}
            isSaving={isSaving}
          />
        </main>
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...styles.toast,
            ...(toast.variant === 'error' ? styles.toastError : styles.toastOk),
          }}
        >
          {toast.message}
        </div>
      )}
      <footer style={styles.footer}>
        {api.isEnabled()
          ? 'Connected to backend'
          : 'Running with local in-memory store'}
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: COLORS.background,
    color: COLORS.text,
    position: 'relative',
  },
  gradientBg: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(249,250,251,0.9))',
    pointerEvents: 'none',
  },
  header: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: COLORS.surface,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  headerLeft: { display: 'flex', gap: 12, alignItems: 'center' },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    background:
      'linear-gradient(135deg, rgba(37,99,235,0.9), rgba(37,99,235,0.6))',
    boxShadow: '0 6px 14px rgba(37,99,235,0.25)',
  },
  brandTitle: { fontWeight: 700, fontSize: 18, color: COLORS.text },
  brandSub: { fontSize: 12, color: 'rgba(17,24,39,0.6)' },
  headerRight: { display: 'flex', gap: 8 },
  shell: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: 16,
    padding: 16,
  },
  sidebar: {
    background: COLORS.surface,
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '70vh',
  },
  sidebarHeader: {
    display: 'flex',
    gap: 8,
    padding: 12,
    borderBottom: '1px solid rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.12)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  list: { overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: {
    position: 'relative',
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 10,
    padding: '10px 36px 10px 12px',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  listItemActive: {
    borderColor: COLORS.primary,
    boxShadow: '0 6px 18px rgba(37,99,235,0.15)',
    transform: 'translateY(-1px)',
  },
  listItemTitle: { fontWeight: 600, color: COLORS.text, marginBottom: 6 },
  listItemMeta: { fontSize: 12, color: 'rgba(17,24,39,0.6)' },
  iconBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 6,
  },
  main: {
    background: COLORS.surface,
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 12,
    boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
    minHeight: '70vh',
    padding: 16,
  },
  editor: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: 'rgba(17,24,39,0.6)' },
  input: {
    padding: '12px 12px',
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.12)',
    outline: 'none',
  },
  inputError: {
    borderColor: COLORS.error,
    boxShadow: '0 0 0 3px rgba(239,68,68,0.12)',
  },
  textarea: {
    minHeight: 260,
    padding: 12,
    borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.12)',
    resize: 'vertical',
  },
  actionsRow: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  primaryBtn: {
    background: COLORS.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    boxShadow: '0 6px 14px rgba(37,99,235,0.25)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  secondaryBtn: {
    background: '#fff',
    color: COLORS.text,
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 10,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed', boxShadow: 'none' },
  empty: { padding: 16, color: 'rgba(17,24,39,0.6)', textAlign: 'center' },
  emptyPanel: {
    color: 'rgba(17,24,39,0.6)',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
  },
  toast: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    padding: '10px 14px',
    borderRadius: 10,
    fontWeight: 600,
    color: '#fff',
    boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
    zIndex: 10,
  },
  toastOk: { background: COLORS.secondary, color: '#111' },
  toastError: { background: COLORS.error },
  footer: {
    marginTop: 8,
    padding: '14px 16px',
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(17,24,39,0.6)',
  },
  '@media': {},
};

// Responsive adjustments via inline style tag injection
const styleTag = document.createElement('style');
styleTag.innerHTML = `
@media (max-width: 900px) {
  .__shell { grid-template-columns: 1fr; }
}
`;
document.head.appendChild(styleTag);

export default App;
