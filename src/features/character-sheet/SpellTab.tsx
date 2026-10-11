import { useState, type KeyboardEvent } from 'react';
import type { CharacterPlayState } from '../../domain/character/types';
import type { Spell } from '../../domain/content/types';
import { Button } from '../../components/ui/button';
import { CollapsibleSection as Section } from './CollapsibleSection';
import type { CharacterSheetViewModel } from './characterSheetViewModel';

interface SpellTabProps {
  readonly sheet: CharacterSheetViewModel;
  readonly playState: CharacterPlayState;
  readonly onPreparedChange: (classEntryId: string, spellId: string, prepared: boolean) => void;
  readonly onSpellSlotChange: (level: number, used: number, maximum: number) => void;
  readonly onShowDetails: (spellId: string) => void;
}

type SpellEntry = {
  readonly spell: Spell;
  readonly classEntryId: string;
  readonly prepared: boolean;
};

export function SpellTab({ sheet, playState, onPreparedChange, onSpellSlotChange, onShowDetails }: SpellTabProps) {
  const [activeCasterId, setActiveCasterId] = useState<string>('all');
  const visibleSpells = sheet.spells.filter((entry) => activeCasterId === 'all' || entry.classEntryId === activeCasterId);
  const visibleCantrips = sheet.cantrips.filter((entry) => activeCasterId === 'all' || entry.classEntryId === activeCasterId);
  const spellLevels = [...new Set([
    ...sheet.spellSlots.map(({ level }) => level),
    ...visibleSpells.map(({ spell }) => spell.level),
    ...visibleCantrips.map(() => 0),
  ])].sort((left, right) => left - right);
  const selectedCaster = sheet.spellcasting.find((entry) => entry.classEntryId === activeCasterId);
  const summaries = sheet.spellSummaries.filter((summary) => activeCasterId === 'all' || summary.classEntryId === activeCasterId || summary.classEntryId === `${activeCasterId}:prepared`);
  const casterIds = ['all', ...sheet.spellcasting.map((caster) => caster.classEntryId)];
  const spellStats = new Set(sheet.spellcasting.map((caster) => caster.ability)).size > 1 ? sheet.spellcasting : sheet.spellcasting.slice(0, 1);
  const moveCasterTab = (event: KeyboardEvent<HTMLButtonElement>, casterId: string) => {
    const currentIndex = casterIds.indexOf(casterId);
    const nextIndex = event.key === 'ArrowRight' ? (currentIndex + 1) % casterIds.length
      : event.key === 'ArrowLeft' ? (currentIndex + casterIds.length - 1) % casterIds.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? casterIds.length - 1 : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setActiveCasterId(casterIds[nextIndex]);
    const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    tabs[nextIndex]?.focus();
  };

  return <Section title="Spells" className="spells-section">
    <dl className="spellcasting-values">
      {spellStats.flatMap((caster) => [<div key={`${caster.classEntryId}:attack`}><dt>{spellStats.length > 1 ? `${caster.className} attack bonus` : 'Attack bonus'}</dt><dd>{caster.attackBonus >= 0 ? `+${caster.attackBonus}` : caster.attackBonus}</dd></div>, <div key={`${caster.classEntryId}:dc`}><dt>{spellStats.length > 1 ? `${caster.className} save DC` : 'Save DC'}</dt><dd>{caster.saveDc}</dd></div>])}
      <div><dt>Spellcasting ability</dt><dd>{selectedCaster ? selectedCaster.ability[0].toUpperCase() + selectedCaster.ability.slice(1) : sheet.spellcasting.map(({ className, ability }) => `${className}: ${ability[0].toUpperCase() + ability.slice(1)}`).join(' / ')}</dd></div>
    </dl>
    <div className="spell-caster-tabs" role="tablist" aria-label="Spellcasting classes">
      <button type="button" role="tab" aria-selected={activeCasterId === 'all'} onClick={() => setActiveCasterId('all')} onKeyDown={(event) => moveCasterTab(event, 'all')}>All</button>
      {sheet.spellcasting.map((caster) => <button key={caster.classEntryId} type="button" role="tab" aria-selected={activeCasterId === caster.classEntryId} onClick={() => setActiveCasterId(caster.classEntryId)} onKeyDown={(event) => moveCasterTab(event, caster.classEntryId)}>{caster.className}</button>)}
    </div>
    <div className="spell-count-summary">
      {activeCasterId === 'all' && <span>{(() => { const originCantrips = sheet.cantrips.filter((entry) => entry.classEntryId.startsWith('origin:')).length; const wizardCantrips = sheet.cantrips.length - originCantrips; return originCantrips === 0 && sheet.spellLimits ? `Cantrips ${sheet.cantrips.length} / ${sheet.spellLimits.cantripsKnown}` : sheet.spellLimits ? `Cantrips ${sheet.cantrips.length} total (${wizardCantrips} Wizard / ${originCantrips} Origin)` : `Cantrips ${sheet.cantrips.length}`; })()}</span>}
      {summaries.map((summary) => <span key={summary.classEntryId}>{summary.className} {summary.label} {summary.current}{summary.maximum === undefined ? '' : ` / ${summary.maximum}`}</span>)}
    </div>
    <div className="spell-level-groups">{spellLevels.map((level) => {
      const slot = sheet.spellSlots.find((entry) => entry.level === level);
      const used = slot ? playState.usedSpellSlots[level] ?? 0 : 0;
      const spells: SpellEntry[] = (level === 0
        ? visibleCantrips.map((entry) => ({ ...entry, prepared: false }))
        : visibleSpells.filter((entry) => entry.spell.level === level))
        .sort((left, right) => Number(right.prepared) - Number(left.prepared) || left.spell.name.localeCompare(right.spell.name));
      return <details className="spell-level-group" key={level} open>
        <summary><h3>{level === 0 ? 'Cantrips' : `Level ${level}`}</h3>{slot && <span className="spell-slot-tracker" aria-label={`${slot.label}, level ${level}`}><span>{slot.maximum} total / {used} used</span><Button type="button" variant="secondary" className="spell-slot-action" aria-label={`Restore level ${level} spell slot`} disabled={used === 0} onClick={(event) => { event.preventDefault(); onSpellSlotChange(level, used - 1, slot.maximum); }}>Restore</Button><Button type="button" className="spell-slot-action" aria-label={`Use level ${level} spell slot`} disabled={used === slot.maximum} onClick={(event) => { event.preventDefault(); onSpellSlotChange(level, used + 1, slot.maximum); }}>Spend</Button></span>}</summary>
        {spells.length > 0 ? <ul>{spells.map((entry) => <SpellRow key={`${entry.classEntryId}:${entry.spell.id}`} entry={entry} casterName={sheet.spellcasting.find((caster) => caster.classEntryId === entry.classEntryId)?.className ?? 'Unknown class'} selectionMode={sheet.spellcasting.find((caster) => caster.classEntryId === entry.classEntryId)?.selectionMode} onPreparedChange={onPreparedChange} onShowDetails={onShowDetails} />)}</ul> : <p className="empty-spell-level">No spells recorded.</p>}
      </details>;
    })}</div>
  </Section>;
}

function SpellRow({ entry, casterName, selectionMode, onPreparedChange, onShowDetails }: { readonly entry: SpellEntry; readonly casterName: string; readonly selectionMode?: 'known-and-prepared' | 'prepared-from-list' | 'level-up-list'; readonly onPreparedChange: SpellTabProps['onPreparedChange']; readonly onShowDetails: SpellTabProps['onShowDetails'] }) {
  const { spell } = entry;
  const components = [spell.components?.verbal ? 'V' : undefined, spell.components?.somatic ? 'S' : undefined, spell.components?.material ? `M (${spell.components.material})` : undefined].filter(Boolean).join(', ');
  const details = [spell.castingTime, spell.range, components || undefined, spell.duration, spell.concentration ? 'Concentration' : undefined, spell.ritual ? 'Ritual' : undefined, spell.scalingBasis ? `Scales by ${spell.scalingBasis.replace('-', ' ')}` : undefined].filter(Boolean).join(' · ');
  const originSpell = entry.classEntryId.startsWith('origin:');
  const canPrepare = !originSpell && spell.level > 0 && selectionMode !== 'level-up-list';
  return <li><div className={`spell-card${canPrepare ? ' spell-card-preparable' : ''}`}><button type="button" className="spell-card-details" aria-label={`View ${spell.name} description`} onClick={() => onShowDetails(spell.id)}><strong>{spell.name}</strong><span className="spell-source">{spell.level === 0 ? 'Cantrip · ' : ''}{originSpell ? (spell.level === 0 ? 'Magic Initiate' : 'Magic Initiate · Always prepared · Free 1/Long Rest') : casterName}</span>{details && <span className="spell-details">{details}</span>}</button>{canPrepare && <label className="spell-prepared"><span aria-hidden="true">Prepared</span><input type="checkbox" aria-label={`Prepare ${spell.name}`} checked={entry.prepared} onChange={(event) => onPreparedChange(entry.classEntryId, spell.id, event.currentTarget.checked)} /></label>}</div></li>;
}
