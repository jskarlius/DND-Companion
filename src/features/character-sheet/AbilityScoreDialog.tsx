import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import { ABILITIES, type AbilityScoreGeneration, type AbilityScores } from '../../domain/character/types';
import { titleCase } from './characterSheetViewModel';

interface AbilityScoreDialogProps {
  readonly scores: AbilityScores;
  readonly generation: AbilityScoreGeneration;
  readonly onSave: (scores: AbilityScores, generation: AbilityScoreGeneration) => void;
}

export function AbilityScoreDialog({ scores, generation, onSave }: AbilityScoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(scores);
  const [method, setMethod] = useState<AbilityScoreGeneration>(generation);
  const [error, setError] = useState<string>();

  const openEditor = () => { setDraft(scores); setMethod(generation); setError(undefined); setOpen(true); };
  const save = () => {
    if (ABILITIES.some((ability) => !Number.isInteger(draft[ability]) || draft[ability] < 1 || draft[ability] > 30)) {
      setError('Each ability score must be a whole number from 1 to 30.');
      return;
    }
    onSave(draft, method);
    setOpen(false);
  };

  return <>
    <button type="button" className="override-button ability-edit-button" aria-label="Edit ability scores" title="Edit ability scores" onClick={openEditor}>
      <span aria-hidden="true">{'\u2699'}</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="ability-score-dialog"><DialogTitle>Ability scores</DialogTitle><DialogDescription>These are the character’s saved final scores. Choose how you generated them for your own reference.</DialogDescription>
      <label className="ability-score-method"><span>Generation method</span><select aria-label="Ability score generation method" value={method} onChange={(event) => setMethod(event.currentTarget.value as AbilityScoreGeneration)}><option value="standard-array">Standard array</option><option value="point-buy">Point buy</option><option value="custom">Custom entry</option></select></label>
      <div className="ability-score-fields">{ABILITIES.map((ability) => <label key={ability}><span>{titleCase(ability)}</span><input aria-label={`${titleCase(ability)} score`} type="number" min="1" max="30" value={draft[ability]} onChange={(event) => { const value = event.currentTarget.valueAsNumber; setDraft((current) => ({ ...current, [ability]: Number.isFinite(value) ? value : 0 })); }} /></label>)}</div>
      {error && <p role="alert">{error}</p>}
      <footer><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" onClick={save}>Save ability scores</Button></footer>
    </DialogContent></Dialog>
  </>;
}
