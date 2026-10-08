import type { Character, CharacterPlayState } from '../domain/character/types';
import type { CharacterExport } from './characterBackup';
import { CompanionDatabase, database } from './database';

/** The only persistence API application features need for this slice. */
export class CharacterRepository {
  constructor(private readonly db: CompanionDatabase = database) {}

  async loadCharacter(id: string): Promise<Character | undefined> {
    return this.db.characters.get(id);
  }

  async listCharacters(): Promise<Character[]> {
    return this.db.characters.toCollection().sortBy('name');
  }

  async loadPlayState(characterId: string): Promise<CharacterPlayState | undefined> {
    return this.db.playState.get(characterId);
  }

  async saveCharacter(character: Character): Promise<void> {
    await this.db.characters.put(character);
  }

  async savePlayState(playState: CharacterPlayState): Promise<void> {
    await this.db.playState.put(playState);
  }

  async save(character: Character, playState: CharacterPlayState): Promise<void> {
    if (character.id !== playState.characterId) throw new Error('Character and play state IDs must match.');
    await this.db.transaction('rw', this.db.characters, this.db.playState, async () => {
      await this.db.characters.put(character);
      await this.db.playState.put(playState);
    });
  }

  async exportCharacter(id: string): Promise<CharacterExport> {
    const [character, playState] = await Promise.all([this.loadCharacter(id), this.loadPlayState(id)]);
    if (!character || !playState) throw new Error('The requested character is incomplete or does not exist.');
    const { createCharacterExport } = await import('./characterBackup');
    return createCharacterExport(character, playState);
  }

  async importCharacter(input: unknown): Promise<CharacterExport> {
    const { migrateCharacterExport } = await import('./characterBackup');
    const backup = migrateCharacterExport(input);
    await this.save(backup.character, backup.playState);
    return backup;
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.characters, this.db.playState, async () => {
      await this.db.characters.delete(id);
      await this.db.playState.delete(id);
    });
  }
}
