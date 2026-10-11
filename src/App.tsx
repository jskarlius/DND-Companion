import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { HashRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { CharacterLibrary } from './features/character-library/CharacterLibrary';
import type { Character } from './domain/character/types';
import { CharacterRepository } from './storage/characterRepository';
import { requestPersistentStorage, type PersistentStorageStatus } from './storage/persistentStorage';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './components/ui/dialog';
import { Moon, Sun } from 'lucide-react';
import { CharacterCreation } from './features/character-creation/CharacterCreation';

const characterRepository = new CharacterRepository();
const RECENT_CHARACTER_KEY = 'dnd-companion-recent-character';
const CharacterRoute = lazy(() => import('./features/character-sheet/CharacterRoute').then((module) => ({ default: module.CharacterRoute })));
type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const storedTheme = window.localStorage.getItem('dnd-companion-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storageExplanation(status: PersistentStorageStatus | 'checking'): string {
  if (status === 'granted') return 'Saved locally; persistent browser storage is enabled.';
  if (status === 'not-granted') return 'Saved locally, but the browser may clear storage under pressure.';
  if (status === 'not-supported') return 'Saved locally. This browser cannot request protected storage.';
  return 'Checking local storage…';
}

function createId(): string {
  return `local:character:${crypto.randomUUID()}`;
}

function downloadBackup(name: string, backup: unknown): void {
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const download = document.createElement('a');
  download.href = url;
  download.download = `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-') || 'character'}.dnd-character.json`;
  download.click();
  URL.revokeObjectURL(url);
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const importInput = useRef<HTMLInputElement>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [storageStatus, setStorageStatus] = useState<PersistentStorageStatus | 'checking'>('checking');
  const [error, setError] = useState<string>();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [recentCharacterId, setRecentCharacterId] = useState<string | undefined>(() => window.localStorage.getItem(RECENT_CHARACTER_KEY) ?? undefined);
  const [deleteCandidate, setDeleteCandidate] = useState<Character>();
  const libraryLoadSequence = useRef(0);

  const refreshCharacters = useCallback(async () => {
    const request = ++libraryLoadSequence.current;
    try {
      const savedCharacters = await characterRepository.listCharacters();
      if (request === libraryLoadSequence.current) {
        setCharacters(savedCharacters);
        setLibraryStatus('ready');
      }
    } catch (cause) {
      if (request === libraryLoadSequence.current) {
        setLibraryStatus('error');
        setError(cause instanceof Error ? cause.message : 'Local characters could not be loaded.');
      }
    }
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; window.localStorage.setItem('dnd-companion-theme', theme); }, [theme]);
  useEffect(() => { void refreshCharacters(); void requestPersistentStorage().then(setStorageStatus).catch(() => setStorageStatus('not-supported')); }, []);

  const rememberCharacter = useCallback((id: string) => { setRecentCharacterId(id); window.localStorage.setItem(RECENT_CHARACTER_KEY, id); }, []);
  const createCharacter = () => { navigate('/create/wizard'); };
  const duplicateCharacter = async (source: Character) => {
    try {
      const playState = await characterRepository.loadPlayState(source.id);
      if (!playState) throw new Error('The selected character has no playable state to duplicate.');
      const id = createId();
      const classEntryIds = new Map(source.classes.map((entry, index) => [entry.id, `${id}:class-entry:${index}`]));
      const classes = source.classes.map((entry) => ({ ...entry, id: classEntryIds.get(entry.id)! }));
      const usedHitDice = Object.fromEntries(
        Object.entries(playState.usedHitDice).flatMap(([classEntryId, used]) => {
          const duplicatedId = classEntryIds.get(classEntryId);
          return duplicatedId === undefined ? [] : [[duplicatedId, used]];
        }),
      );
      await characterRepository.save({
        ...source, id, name: `${source.name} copy`, classes,
        spellSelections: source.spellSelections.map((selection) => ({ ...selection, classEntryId: classEntryIds.get(selection.classEntryId) ?? selection.classEntryId })),
        preparedSpells: source.preparedSpells.map((selection) => ({ ...selection, classEntryId: classEntryIds.get(selection.classEntryId) ?? selection.classEntryId })),
        hitPointGains: source.hitPointGains.map((gain) => ({ ...gain, classEntryId: classEntryIds.get(gain.classEntryId) ?? gain.classEntryId })),
      }, { ...playState, characterId: id, usedHitDice });
      await refreshCharacters();
      rememberCharacter(id);
      navigate(`/characters/${encodeURIComponent(id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The character could not be duplicated.'); }
  };
  const exportCharacter = async (character: Character) => {
    try { downloadBackup(character.name, await characterRepository.exportCharacter(character.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The character backup could not be exported.'); }
  };
  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try { const backup = await characterRepository.importCharacter(JSON.parse(await file.text())); await refreshCharacters(); rememberCharacter(backup.character.id); navigate(`/characters/${encodeURIComponent(backup.character.id)}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The character backup could not be imported.'); }
    finally { if (importInput.current) importInput.current.value = ''; }
  };
  const deleteCharacter = async () => {
    if (!deleteCandidate) return;
    try { await characterRepository.deleteCharacter(deleteCandidate.id); if (recentCharacterId === deleteCandidate.id) { setRecentCharacterId(undefined); window.localStorage.removeItem(RECENT_CHARACTER_KEY); } setDeleteCandidate(undefined); await refreshCharacters(); navigate('/'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The character could not be deleted.'); }
  };

  return <>
    <div className="app-layout">
    <aside className="app-sidebar">
      <Link className="app-brand" to="/">D&amp;D Companion</Link>
      <nav aria-label="Application"><Link className={location.pathname === '/' ? 'app-nav-active' : undefined} aria-current={location.pathname === '/' ? 'page' : undefined} to="/">Library</Link></nav>
      <div className="app-sidebar-actions"><Button type="button" variant="secondary" onClick={() => importInput.current?.click()}>Import backup</Button><input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Import character backup" onChange={(event) => void importBackup(event.currentTarget.files?.[0])} /><Button type="button" variant="ghost" className="theme-toggle" aria-pressed={theme === 'dark'} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}<span className="visually-hidden">{theme === 'light' ? 'Use dark theme' : 'Use light theme'}</span></Button></div>
    </aside>
    <div className="app-content">
      <aside className="storage-status" aria-label="Local storage and backups"><p role="status">{storageExplanation(storageStatus)} Keep exports as backups.</p>{error && <p className="storage-error" role="alert">{error}</p>}</aside>
    <Routes>
      <Route path="/" element={libraryStatus === 'loading'
        ? <main className="route-message" aria-live="polite"><h1>Loading character library…</h1></main>
        : libraryStatus === 'error'
          ? <main className="route-message"><h1>Character library unavailable</h1><p>Local storage could not load your characters.</p><Button type="button" onClick={() => { setLibraryStatus('loading'); void refreshCharacters(); }}>Try again</Button></main>
          : <CharacterLibrary characters={characters} recentCharacterId={recentCharacterId} onCreate={() => void createCharacter()} onDuplicate={(character) => void duplicateCharacter(character)} onExport={(character) => void exportCharacter(character)} onDelete={setDeleteCandidate} />} />
      <Route path="/create/wizard" element={<CharacterCreation />} />
      <Route path="/characters/:characterId" element={<Suspense fallback={<main className="route-message" aria-live="polite"><h1>Loading character…</h1></main>}><CharacterRoute onRemember={rememberCharacter} onStorageError={setError} onAdvancementCommitted={() => { void refreshCharacters(); }} /></Suspense>} />
      <Route path="*" element={<main className="route-message"><h1>Page not found</h1><p>The requested page does not exist.</p><Button asChild><Link to="/">Return to library</Link></Button></main>} />
    </Routes>
    </div>
    </div>
    {deleteCandidate && <Dialog open onOpenChange={(open) => { if (!open) setDeleteCandidate(undefined); }}><DialogContent><DialogTitle>Delete {deleteCandidate.name}?</DialogTitle><DialogDescription>This permanently removes this character and its play state from this device. Other characters and content packs are not affected.</DialogDescription><div className="dialog-actions"><Button type="button" variant="secondary" onClick={() => setDeleteCandidate(undefined)}>Cancel</Button><Button type="button" variant="destructive" onClick={() => void deleteCharacter()}>Delete character</Button></div></DialogContent></Dialog>}
  </>;
}

export default function App() { return <HashRouter><AppShell /></HashRouter>; }
