import { useMemo, useState } from 'react';

import { bundledContentRepository } from '../domain/content/bundledContent';
import type { Species } from '../domain/content/types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './BackgroundChoicePicker.css';

export function SpeciesChoicePicker({ species, value, onChange }: {
  readonly species: readonly Species[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [previewId, setPreviewId] = useState(value);
  const selected = species.find((entry) => entry.id === value);
  const matches = useMemo(() => species.filter((entry) => entry.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, species]);
  const preview = species.find((entry) => entry.id === previewId) ?? matches[0];
  const previewFeatures = (preview?.featureIds ?? []).map((id) => bundledContentRepository.getFeature(id)).filter((feature): feature is NonNullable<typeof feature> => Boolean(feature) && !['Size', 'Speed', 'Darkvision'].includes(feature!.name));
  const choose = (id: string) => { onChange(id); setPreviewId(id); setOpen(false); };

  return <div className="background-choice-picker">
    <span>Species</span>
    <Button type="button" variant="secondary" className="background-choice-trigger" onClick={() => { setPreviewId(value || species[0]?.id || ''); setOpen(true); }}>
      {selected?.name ?? 'Choose a species'}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="background-picker-dialog">
        <DialogTitle>Choose a species</DialogTitle>
        <DialogDescription>Search the reviewed species currently supported in character creation.</DialogDescription>
        <input aria-label="Search species" autoFocus value={query} placeholder="Search species" onChange={(event) => setQuery(event.target.value)} />
        <div className="background-picker-browser">
          <ul role="listbox" aria-label="Species matches">
            {matches.map((entry) => <li key={entry.id}><button type="button" role="option" aria-selected={entry.id === value} onMouseEnter={() => setPreviewId(entry.id)} onFocus={() => setPreviewId(entry.id)} onClick={() => choose(entry.id)}>{entry.name}</button></li>)}
          </ul>
          {preview && <section className="background-choice-preview"><h3>{preview.name}</h3><p><strong>Size:</strong> {preview.traits?.size}</p><p><strong>Speed:</strong> {preview.traits?.speed} ft.</p><p><strong>Senses:</strong> {preview.traits?.senses.join(', ') || 'None'}</p><p><strong>Damage resistances:</strong> {preview.traits?.damageResistances.join(', ') || 'None'}</p><div className="background-picker-equipment"><strong>Species traits</strong>{previewFeatures.map((feature) => <p key={feature.id}><b>{feature.name}:</b> {feature.description ?? 'Reference details are not available.'}</p>)}</div></section>}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
