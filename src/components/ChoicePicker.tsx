import { useState } from 'react';

import type { SpeciesChoice } from '../domain/content/types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import './BackgroundChoicePicker.css';

export function ChoicePicker({ choice, value, onChange }: {
  readonly choice: SpeciesChoice;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState(value);
  const selected = choice.options.find((option) => option.id === value);
  const preview = choice.options.find((option) => option.id === previewId) ?? choice.options[0];
  const choose = (id: string) => { onChange(id); setPreviewId(id); setOpen(false); };
  return <div className="background-choice-picker species-choice-picker">
    <span>{choice.label}</span>
    <Button type="button" variant="secondary" className="background-choice-trigger" onClick={() => { setPreviewId(value || choice.options[0]?.id || ''); setOpen(true); }}>{selected?.label ?? `Choose ${choice.label}`}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="background-picker-dialog"><DialogTitle>Choose {choice.label}</DialogTitle><DialogDescription>Review each option before selecting it.</DialogDescription><div className="background-picker-browser choice-picker-browser"><ul role="listbox" aria-label={`${choice.label} options`}>{choice.options.map((option) => <li key={option.id}><button type="button" role="option" aria-selected={option.id === value} onMouseEnter={() => setPreviewId(option.id)} onFocus={() => setPreviewId(option.id)} onClick={() => choose(option.id)}>{option.label}</button></li>)}</ul>{preview && <section className="background-choice-preview"><h3>{preview.label}</h3><p>{preview.description}</p>{preview.resource && <p><strong>Uses:</strong> equal to your proficiency bonus; recharges on a {preview.resource.recharge.replace('-', ' ')}.</p>}</section>}</div></DialogContent></Dialog>
  </div>;
}
