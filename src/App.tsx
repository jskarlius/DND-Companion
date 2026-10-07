import { useEffect, useState } from 'react';
import './App.css';
import { CharacterSheet } from './features/character-sheet/CharacterSheet';
import {
  representativeCharacter,
  representativeCharacterSheetDetails,
  representativePlayState,
} from './features/character-sheet/characterSheetFixture';
import { minimalContentFixture } from './domain/content/fixtures';
import type { Character, CharacterPlayState } from './domain/character/types';
import { CharacterRepository } from './storage/characterRepository';
import { requestPersistentStorage, type PersistentStorageStatus } from './storage/persistentStorage';

const characterRepository = new CharacterRepository();

function storageExplanation(status: PersistentStorageStatus | 'checking'): string {
  if (status === 'granted') return 'Saved locally; persistent browser storage is enabled. Keep exports as backups.';
  if (status === 'not-granted') return 'Saved locally, but the browser may clear storage under pressure. Export regular backups.';
  if (status === 'not-supported') return 'Saved locally. This browser cannot request protected storage, so export regular backups.';
  return 'Loading local character data…';
}

function App() {
  const [character, setCharacter] = useState<Character>(representativeCharacter);
  const [playState, setPlayState] = useState<CharacterPlayState>(representativePlayState);
  const [storageStatus, setStorageStatus] = useState<PersistentStorageStatus | 'checking'>('checking');
  const [backupError, setBackupError] = useState<string>();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [savedCharacter, savedPlayState, persistence] = await Promise.all([
          characterRepository.loadCharacter(representativeCharacter.id),
          characterRepository.loadPlayState(representativeCharacter.id),
          requestPersistentStorage(),
        ]);
        if (!savedCharacter || !savedPlayState) await characterRepository.save(representativeCharacter, representativePlayState);
        if (!active) return;
        if (savedCharacter && savedPlayState) {
          setCharacter(savedCharacter);
          setPlayState(savedPlayState);
        }
        setStorageStatus(persistence);
      } catch (error) {
        if (active) setBackupError(error instanceof Error ? error.message : 'Local storage could not be opened.');
      }
    })();
    return () => { active = false; };
  }, []);

  const saveCharacter = (nextCharacter: Character) => {
    setCharacter(nextCharacter);
    void characterRepository.saveCharacter(nextCharacter).catch((error: unknown) => setBackupError(error instanceof Error ? error.message : 'Character changes could not be saved.'));
  };

  const savePlayState = (nextPlayState: CharacterPlayState) => {
    setPlayState(nextPlayState);
    void characterRepository.savePlayState(nextPlayState).catch((error: unknown) => setBackupError(error instanceof Error ? error.message : 'Play-state changes could not be saved.'));
  };

  const exportBackup = async () => {
    try {
      const backup = await characterRepository.exportCharacter(character.id);
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const download = document.createElement('a');
      download.href = url;
      download.download = `${character.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-') || 'character'}.dnd-character.json`;
      download.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Character backup could not be exported.');
    }
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = await characterRepository.importCharacter(JSON.parse(await file.text()));
      setCharacter(backup.character);
      setPlayState(backup.playState);
      setBackupError(undefined);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Character backup could not be imported.');
    }
  };

  return <>
    <aside className="storage-status" aria-label="Local storage and backups">
      <p role="status">{storageExplanation(storageStatus)}</p>
      <div><button type="button" onClick={() => void exportBackup()}>Export character backup</button><label>Import character backup<input type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.currentTarget.files?.[0])} /></label></div>
      {backupError && <p className="storage-error" role="alert">{backupError}</p>}
    </aside>
    <CharacterSheet character={character} playState={playState} content={minimalContentFixture} details={representativeCharacterSheetDetails} onCharacterChange={saveCharacter} onPlayStateChange={savePlayState} />
  </>;
}

export default App;
