import './App.css';
import { CharacterSheet } from './features/character-sheet/CharacterSheet';
import {
  representativeCharacter,
  representativeCharacterSheetDetails,
  representativePlayState,
} from './features/character-sheet/characterSheetFixture';
import { minimalContentFixture } from './domain/content/fixtures';

function App() {
  return <CharacterSheet character={representativeCharacter} playState={representativePlayState} content={minimalContentFixture} details={representativeCharacterSheetDetails} />;
}

export default App;
