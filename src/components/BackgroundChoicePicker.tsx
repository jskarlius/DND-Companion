import { useMemo, useState } from 'react';

import type { Background } from '../domain/content/types';
import type { StartingEquipmentEntry } from '../domain/content/types';
import { bundledContentRepository } from '../domain/content/bundledContent';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './BackgroundChoicePicker.css';

function displayName(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function names(ids: readonly string[] | undefined, resolve: (id: string) => string | undefined): string {
  if (!ids?.length) return 'None';
  return ids.map((id) => resolve(id) ?? displayName(id.split(':').at(-1) ?? id)).join(', ');
}

function equipmentSummary(entries: readonly StartingEquipmentEntry[], currencyGp: number): string {
  const equipment = entries.map((entry) => entry.type === 'item'
    ? `${entry.quantity > 1 ? `${entry.quantity} × ` : ''}${bundledContentRepository.getItem(entry.itemId)?.name ?? displayName(entry.itemId.split(':').at(-1) ?? entry.itemId)}`
    : `Chosen ${displayName(entry.choiceId)}`);
  return [...equipment, `${currencyGp} gp`].join(', ');
}

export function BackgroundChoicePicker({ backgrounds, value, onChange }: {
  readonly backgrounds: readonly Background[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [previewId, setPreviewId] = useState(value);
  const selected = backgrounds.find((background) => background.id === value);
  const matches = useMemo(() => backgrounds.filter((background) => background.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [backgrounds, query]);
  const preview = backgrounds.find((background) => background.id === previewId) ?? matches[0];
  const choose = (id: string) => { onChange(id); setPreviewId(id); setOpen(false); };

  return <div className="background-choice-picker">
    <span>Background</span>
    <Button type="button" variant="secondary" className="background-choice-trigger" onClick={() => { setPreviewId(value || (backgrounds[0]?.id ?? '')); setOpen(true); }}>
      {selected?.name ?? 'Choose a background'}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="background-picker-dialog">
        <DialogTitle>Choose a background</DialogTitle>
        <DialogDescription>Search installed backgrounds and review their creation grants.</DialogDescription>
        <input aria-label="Search backgrounds" autoFocus value={query} placeholder="Search backgrounds" onChange={(event) => setQuery(event.target.value)} />
        <div className="background-picker-browser">
          <ul role="listbox" aria-label="Background matches">
            {matches.map((background) => <li key={background.id}><button type="button" role="option" aria-selected={background.id === value} onMouseEnter={() => setPreviewId(background.id)} onFocus={() => setPreviewId(background.id)} onClick={() => choose(background.id)}>{background.name}</button></li>)}
          </ul>
          {preview && <section className="background-choice-preview"><h3>{preview.name}</h3><p><strong>Ability increases:</strong> {preview.creation?.abilityScoreOptions?.map(displayName).join(', ') ?? 'Not structured'}</p><p><strong>Skills:</strong> {names(preview.creation?.skillGrants, (id) => displayName(id))}</p><p><strong>Tools:</strong> {names(preview.creation?.toolGrants, (id) => bundledContentRepository.getItem(id)?.name)}</p><p><strong>Origin Feat:</strong> {names(preview.creation?.featIds, (id) => bundledContentRepository.getFeat(id)?.name)}</p><div className="background-picker-equipment"><strong>Equipment</strong>{preview.creation?.equipmentPackages?.map((choice) => <p key={choice.id}><b>Option {choice.id.toUpperCase()}:</b> {equipmentSummary(choice.entries, choice.currencyGp)}</p>) ?? <p>Not structured</p>}</div></section>}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
