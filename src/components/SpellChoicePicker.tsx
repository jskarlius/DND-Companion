import { useEffect, useState } from 'react';
import type { Spell } from '../domain/content/types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './SpellChoicePicker.css';

function spellMetadata(spell: Spell): string {
  const titleCase = (value: string) => value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
  const parts = [spell.castingTime, spell.range, spell.duration].filter((value): value is string => Boolean(value)).map(titleCase);
  if (spell.concentration) parts.push('Concentration');
  if (spell.ritual) parts.push('Ritual');
  if (spell.components) {
    const components = [spell.components.verbal && 'V', spell.components.somatic && 'S', spell.components.material && `M (${spell.components.material})`].filter(Boolean).join(', ');
    if (components) parts.push(components);
  }
  return parts.join(' · ');
}

/** A searchable, keyboard-friendly one-spell picker shared by creation and level-up. */
export function SpellChoicePicker({ label, value, spells, onChange, onShowDetails }: {
  readonly label: string;
  readonly value: string;
  readonly spells: readonly Spell[];
  readonly onChange: (id: string) => void;
  readonly onShowDetails: (id: string) => void;
}) {
  const selected = spells.find((spell) => spell.id === value);
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState(value);
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const filtered = spells.filter((spell) => spell.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const spellLevels = [...new Set(spells.map((spell) => spell.level))].sort((left, right) => left - right);
  const displayed = filtered.filter((spell) => levelFilter === 'all' || spell.level === levelFilter).sort((left, right) => left.name.localeCompare(right.name));
  const preview = spells.find((spell) => spell.id === previewId) ?? filtered[0];
  useEffect(() => {
    const current = spells.find((spell) => spell.id === value);
    setQuery(current?.name ?? '');
    setPreviewId(value);
  }, [value]);
  const selectSpell = (spell: Spell) => { onChange(spell.id); setQuery(spell.name); setPreviewId(spell.id); setOpen(false); };

  return <><label className="spell-choice-picker"><span>{label}</span><div className="spell-choice-input"><input aria-label={label} role="combobox" aria-autocomplete="none" aria-expanded={open} value={selected?.name ?? ''} placeholder="Search spells" onFocus={() => setOpen(true)} onChange={(event) => { const exactMatch = spells.find((spell) => spell.name.localeCompare(event.currentTarget.value, undefined, { sensitivity: 'accent' }) === 0); if (exactMatch) selectSpell(exactMatch); else { setQuery(event.currentTarget.value); setPreviewId(''); setOpen(true); } }} />{value && <button type="button" className="spell-choice-clear" aria-label={`Clear ${label}`} onClick={() => { onChange(''); setQuery(''); setPreviewId(''); }}>×</button>}</div></label>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className={`spell-picker-dialog ${spellLevels.length > 1 ? 'spell-picker-dialog--tabs' : ''}`}><DialogTitle>Choose {label}</DialogTitle><DialogDescription>Search eligible spells and inspect their details before selecting one.</DialogDescription><input className="spell-picker-search" aria-label={`Search ${label}`} autoFocus value={query} placeholder="Search spells" onChange={(event) => { setQuery(event.currentTarget.value); setPreviewId(''); }} />{spellLevels.length > 1 && <div className="spell-level-tabs" role="tablist" aria-label={`${label} spell levels`}><button type="button" role="tab" aria-selected={levelFilter === 'all'} onClick={() => setLevelFilter('all')}>All</button>{spellLevels.map((level) => <button key={level} type="button" role="tab" aria-selected={levelFilter === level} onClick={() => setLevelFilter(level)}>{level === 0 ? 'Cantrips' : `Level ${level}`}</button>)}</div>}<div className="spell-picker-browser"><ul role="listbox" aria-label={`${label} matches`}>{displayed.map((spell) => <li key={spell.id}><button type="button" role="option" aria-selected={spell.id === value} onMouseEnter={() => setPreviewId(spell.id)} onFocus={() => setPreviewId(spell.id)} onClick={() => selectSpell(spell)}><span className="spell-choice-name">{spell.name}</span><small>Level {spell.level}</small></button></li>)}</ul>{displayed.length === 0 && <p>No eligible spells match that search.</p>}{preview && <div className="spell-choice-preview"><strong>{preview.name}</strong>{spellMetadata(preview) && <small className="spell-choice-metadata">{spellMetadata(preview)}</small>}<p>{preview.description || 'No description is available.'}</p><Button type="button" variant="secondary" onClick={() => { setOpen(false); onShowDetails(preview.id); }}>View full description</Button></div>}</div></DialogContent></Dialog>
  </>;
}
