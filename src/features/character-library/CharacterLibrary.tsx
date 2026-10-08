import { Link } from 'react-router-dom';
import type { Character } from '../../domain/character/types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import './CharacterLibrary.css';

interface CharacterLibraryProps {
  readonly characters: readonly Character[];
  readonly recentCharacterId?: string;
  readonly onCreate: () => void;
  readonly onDuplicate: (character: Character) => void;
  readonly onExport: (character: Character) => void;
  readonly onDelete: (character: Character) => void;
}

function classSummary(character: Character): string {
  if (character.classes.length === 0) return 'Character details to be chosen';
  return character.classes.map((entry) => `${entry.classId.split(':').at(-1)?.replaceAll('-', ' ') ?? 'Class'} ${entry.level}`).join(' / ');
}

export function CharacterLibrary({ characters, recentCharacterId, onCreate, onDuplicate, onExport, onDelete }: CharacterLibraryProps) {
  const displayedCharacters = [...characters].sort((left, right) => {
    if (left.id === recentCharacterId) return -1;
    if (right.id === recentCharacterId) return 1;
    return left.name.localeCompare(right.name);
  });

  return <main className="library-page">
    <header className="library-heading">
      <div><p className="eyebrow">Local character library</p><h1>Your adventurers</h1><p>Characters and play state are saved only on this device. Export regular backups.</p></div>
      <Button type="button" onClick={onCreate}>Create character</Button>
    </header>

    {characters.length === 0 ? <Card className="library-empty">
      <h2>Start your party</h2>
      <p>Create a character or import a backup to begin. Guided character choices will be added in a later slice.</p>
      <Button type="button" onClick={onCreate}>Create your first character</Button>
    </Card> : <section aria-label="Saved characters" className="character-library-grid">
      {displayedCharacters.map((character) => <Card key={character.id} className="character-library-card">
        <div className="character-library-card-header"><div><p className="eyebrow">{character.id === recentCharacterId ? 'Recently opened' : '2024 rules'}</p><h2><Link to={`/characters/${encodeURIComponent(character.id)}`}>{character.name}</Link></h2></div>{character.id === recentCharacterId && <span className="recent-badge">Recent</span>}</div>
        <p className="character-library-class">{classSummary(character)}</p>
        <div className="character-library-actions">
          <Button asChild><Link to={`/characters/${encodeURIComponent(character.id)}`}>Open sheet</Link></Button>
          <Button type="button" variant="secondary" onClick={() => onDuplicate(character)}>Duplicate</Button>
          <Button type="button" variant="secondary" onClick={() => onExport(character)}>Export</Button>
          <Button type="button" variant="destructive" onClick={() => onDelete(character)}>Delete</Button>
        </div>
      </Card>)}
    </section>}
  </main>;
}
