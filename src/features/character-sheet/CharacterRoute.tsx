import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import type { Character, CharacterPlayState } from '../../domain/character/types';
import { bundledContentRepository } from '../../domain/content/bundledContent';
import { CharacterRepository } from '../../storage/characterRepository';
import { CharacterSheet } from './CharacterSheet';
import { createUnchosenCharacterSheetDetails } from './characterSheetFixture';

const characterRepository = new CharacterRepository();

interface CharacterRouteProps {
  readonly onRemember: (id: string) => void;
  readonly onStorageError: (error?: string) => void;
  readonly onAdvancementCommitted: () => void;
}

export function CharacterRoute({ onRemember, onStorageError, onAdvancementCommitted }: CharacterRouteProps) {
  const { characterId } = useParams();
  const [character, setCharacter] = useState<Character>();
  const [playState, setPlayState] = useState<CharacterPlayState>();
  const [status, setStatus] = useState<'loading' | 'missing' | 'error' | 'ready'>('loading');

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!characterId) return;
      try {
        setStatus('loading');
        const [savedCharacter, savedPlayState] = await Promise.all([
          characterRepository.loadCharacter(characterId),
          characterRepository.loadPlayState(characterId),
        ]);
        if (!active) return;
        if (!savedCharacter || !savedPlayState) {
          setStatus('missing');
          return;
        }
        setCharacter(savedCharacter);
        setPlayState(savedPlayState);
        setStatus('ready');
        onRemember(characterId);
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => { active = false; };
  }, [characterId, onRemember]);

  if (status === 'loading') {
    return <main className="route-message" aria-live="polite"><h1>Loading character…</h1></main>;
  }
  if (status === 'missing') {
    return <main className="route-message"><h1>Character not found</h1><p>This character may have been deleted or has not been imported on this device.</p><Button asChild><Link to="/">Return to library</Link></Button></main>;
  }
  if (status === 'error' || !character || !playState) {
    return <main className="route-message"><h1>Character unavailable</h1><p>Local storage could not load this character. Return to the library and try again.</p><Button asChild><Link to="/">Return to library</Link></Button></main>;
  }

  return <CharacterSheet
    character={character}
    playState={playState}
    content={bundledContentRepository.getFixture()}
    details={createUnchosenCharacterSheetDetails(character, bundledContentRepository.getFixture())}
    onCharacterChange={(next) => {
      setCharacter(next);
      void characterRepository.saveCharacter(next)
        .then(() => onStorageError(undefined))
        .catch((cause: unknown) => onStorageError(cause instanceof Error ? cause.message : 'Character changes could not be saved locally.'));
    }}
    onPlayStateChange={(next) => {
      setPlayState(next);
      void characterRepository.savePlayState(next)
        .then(() => onStorageError(undefined))
        .catch((cause: unknown) => onStorageError(cause instanceof Error ? cause.message : 'Play-state changes could not be saved locally.'));
    }}
    onAdvancementCommit={async (nextCharacter, unchangedPlayState) => {
      await characterRepository.commitAdvancement(nextCharacter, unchangedPlayState);
      setCharacter(nextCharacter);
      setPlayState(unchangedPlayState);
      onStorageError(undefined);
      onAdvancementCommitted();
    }}
  />;
}
