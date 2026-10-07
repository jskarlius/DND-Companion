import { useState, type ReactNode } from 'react';
import { resolveManualOverride } from '../../domain/character/calculations';
import { setCurrentHp, setResourceUses, setSpellSlotUses, setTemporaryHp, setTemporaryMaximumHpBonus, takeRest } from '../../domain/character/playState';
import type { Character, CharacterPlayState, ManualOverride, ManualOverrideTarget } from '../../domain/character/types';
import type { ContentFixture } from '../../domain/content/types';
import type { CharacterSheetDetails } from './characterSheetFixture';
import { buildCharacterSheetViewModel, titleCase } from './characterSheetViewModel';
import './CharacterSheet.css';

interface CharacterSheetProps {
  readonly character: Parameters<typeof buildCharacterSheetViewModel>[0];
  readonly playState: CharacterPlayState;
  readonly content: ContentFixture;
  readonly details: CharacterSheetDetails;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function Section({ title, children, className }: { readonly title: string; readonly children: ReactNode; readonly className?: string }) {
  const id = `section-${title.toLowerCase().replaceAll(' ', '-')}`;
  return <section className={`sheet-section${className ? ` ${className}` : ''}`} aria-labelledby={id}><h2 id={id}>{title}</h2>{children}</section>;
}

function baseCalculation(value: number, label: string) {
  return { value, terms: [{ label, operation: 'base' as const, value }] };
}

function OverrideButton({ label, active, onClick }: { readonly label: string; readonly active: boolean; readonly onClick: () => void }) {
  return <button type="button" className={`override-button${active ? ' override-active' : ''}`} aria-label={`Override ${label}`} title={`Override ${label}`} onClick={onClick}><span aria-hidden="true">⚙</span></button>;
}

function OverrideReason({ override }: { readonly override?: ManualOverride }) {
  return override?.reason ? <small className="override-reason">Override: {override.reason}</small> : null;
}

function OverrideDialog({
  target, label, calculatedValue, override, onSave, onClose, onReset,
}: {
  readonly target: ManualOverrideTarget;
  readonly label: string;
  readonly calculatedValue: number;
  readonly override?: ManualOverride;
  readonly onSave: (target: ManualOverrideTarget, override: ManualOverride) => void;
  readonly onClose: () => void;
  readonly onReset: (target: ManualOverrideTarget) => void;
}) {
  const [value, setValue] = useState(String(override?.value ?? calculatedValue));
  const [reason, setReason] = useState(override?.reason ?? '');
  return <div className="dialog-backdrop" role="presentation"><section className="override-dialog" role="dialog" aria-modal="true" aria-labelledby="override-dialog-title"><header><h2 id="override-dialog-title">Override {label}</h2><button type="button" aria-label="Close override editor" onClick={onClose}>×</button></header><p>Calculated value: <strong>{calculatedValue}</strong></p><label>Override value<input type="number" aria-label={`${label} override value`} value={value} onChange={(event) => setValue(event.currentTarget.value)} /></label><label>Reason <span>(optional)</span><textarea aria-label={`${label} override reason`} value={reason} onChange={(event) => setReason(event.currentTarget.value)} /></label><footer>{override && <button type="button" className="remove-override" onClick={() => { onReset(target); onClose(); }}>Remove override</button>}<button type="button" onClick={onClose}>Cancel</button><button type="button" onClick={() => { const numericValue = Number(value); if (Number.isFinite(numericValue)) { onSave(target, { value: numericValue, reason: reason.trim() || undefined }); onClose(); } }}>Save override</button></footer></section></div>;
}

export function CharacterSheet({ character, playState, content, details }: CharacterSheetProps) {
  const [draftCharacter, setDraftCharacter] = useState(character);
  const [sessionState, setSessionState] = useState(playState);
  const [conditionName, setConditionName] = useState('');
  const [pendingRest, setPendingRest] = useState<'short' | 'long' | null>(null);
  const [editingOverride, setEditingOverride] = useState<ManualOverrideTarget | null>(null);
  const sheet = buildCharacterSheetViewModel(draftCharacter, sessionState, content, details);
  const { combat } = details;
  const [activeTab, setActiveTab] = useState<'sheet' | 'character' | 'inventory'>('sheet');
  const armorClass = resolveManualOverride(baseCalculation(combat.armorClass, 'Calculated armor class'), draftCharacter.manualOverrides, 'armorClass').value;
  const speed = resolveManualOverride(baseCalculation(combat.speed, 'Calculated speed'), draftCharacter.manualOverrides, 'speed').value;
  const baseMaximumHp = resolveManualOverride(baseCalculation(combat.maximumHp, 'Calculated maximum HP'), draftCharacter.manualOverrides, 'maximumHp').value;
  const maximumHp = baseMaximumHp + sessionState.temporaryMaximumHpBonus;

  const changeOverride = (target: ManualOverrideTarget, override?: ManualOverride) => {
    setDraftCharacter((current) => {
      const manualOverrides = { ...current.manualOverrides };
      if (override === undefined) delete manualOverrides[target];
      else manualOverrides[target] = override;
      return { ...current, manualOverrides };
    });
  };

  const overrideDetails: Record<ManualOverrideTarget, { label: string; calculatedValue: number }> = {
    armorClass: { label: 'Armor class', calculatedValue: combat.armorClass },
    maximumHp: { label: 'Maximum HP', calculatedValue: combat.maximumHp },
    speed: { label: 'Speed', calculatedValue: combat.speed },
    spellAttackBonus: { label: 'Spell attack bonus', calculatedValue: combat.spellAttackBonus },
    spellSaveDc: { label: 'Spell save DC', calculatedValue: combat.spellSaveDc },
  };

  const setDeathSave = (kind: 'deathSaveSuccesses' | 'deathSaveFailures', index: number, checked: boolean) => {
    setSessionState((current) => ({ ...current, [kind]: checked ? Math.max(current[kind], index + 1) : Math.min(current[kind], index) }));
  };

  return (
    <main className="character-sheet">
      <header className="sheet-header">
        <div><p className="eyebrow">{character.ruleset.replace('e-', 'th edition ')}</p><h1>{character.name}</h1></div>
        <dl className="identity-list">
          <div><dt>Classes</dt><dd>{sheet.classes.map((entry) => `${entry.name} ${entry.level}`).join(' / ')}</dd></div>
          <div><dt>Species</dt><dd>{details.identity.species}</dd></div>
          <div><dt>Background</dt><dd>{details.identity.background}</dd></div>
          <div><dt>Player</dt><dd>{details.identity.playerName}</dd></div>
        </dl>
      </header>

      <section className="summary-grid" aria-label="Character summary">
        <div><span>Level</span><strong>{sheet.totalLevel}</strong></div>
        <div><span>Proficiency</span><strong>{signed(sheet.proficiencyBonus)}</strong></div>
        <div><span>Armor Class <OverrideButton label="armor class" active={Boolean(draftCharacter.manualOverrides.armorClass)} onClick={() => setEditingOverride('armorClass')} /></span><strong>{armorClass}</strong><OverrideReason override={draftCharacter.manualOverrides.armorClass} /></div>
        <div><span>Speed <OverrideButton label="speed" active={Boolean(draftCharacter.manualOverrides.speed)} onClick={() => setEditingOverride('speed')} /></span><strong>{speed} ft.</strong><OverrideReason override={draftCharacter.manualOverrides.speed} /></div>
        <div><span>Hit Dice</span><strong>{combat.hitDice}</strong></div>
      </section>

      <div className="sheet-tabs" role="tablist" aria-label="Character sheet sections">
        {(['sheet', 'character', 'inventory'] as const).map((tab) => (
          <button key={tab} type="button" role="tab" id={`${tab}-tab`} aria-controls={`${tab}-panel`} aria-selected={activeTab === tab} className={activeTab === tab ? 'active-tab' : undefined} onClick={() => setActiveTab(tab)}>
            {titleCase(tab)}
          </button>
        ))}
      </div>

      {activeTab === 'sheet' && <div className="sheet-grid" role="tabpanel" id="sheet-panel" aria-labelledby="sheet-tab">
        <div className="sheet-column">
          <Section title="Abilities"><dl className="ability-grid">{sheet.abilities.map(({ ability, score, modifier }) => <div key={ability}><dt>{titleCase(ability)}</dt><dd>{score}<small>{signed(modifier)}</small></dd></div>)}</dl></Section>
          <Section title="Saving throws"><ul className="check-list">{sheet.savingThrows.map(({ ability, value, proficient }) => <li key={ability}><span aria-label={`${titleCase(ability)} saving throw${proficient ? ', proficient' : ''}`} className={proficient ? 'proficient-marker' : 'marker'}>{proficient ? '\u25cf' : '\u25cb'}</span><b>{signed(value)}</b>{titleCase(ability)}</li>)}</ul></Section>
          <Section title="Skills"><ul className="check-list skill-list">{sheet.skills.map(({ skill, value, proficiency }) => <li key={skill}><span aria-label={`${titleCase(skill)}: ${proficiency}`} className={proficiency === 'none' ? 'marker' : 'proficient-marker'}>{proficiency === 'expertise' ? '\u25c6' : proficiency === 'proficient' ? '\u25cf' : '\u25cb'}</span><b>{signed(value)}</b>{titleCase(skill)}{proficiency === 'expertise' && <em>Expertise</em>}</li>)}</ul></Section>
        </div>

        <div className="sheet-column sheet-column-wide">
          <Section title="Hit points" className="hit-points-section"><div className="hit-points"><label><span>Current</span><input type="number" aria-label="Current hit points" value={sessionState.currentHp} min="0" max={maximumHp} onChange={(event) => { const value = event.currentTarget.valueAsNumber; setSessionState((current) => setCurrentHp(current, Number.isFinite(value) ? value : 0, maximumHp)); }} /></label><div><span>Maximum <OverrideButton label="maximum HP" active={Boolean(draftCharacter.manualOverrides.maximumHp)} onClick={() => setEditingOverride('maximumHp')} /></span><strong>{maximumHp}</strong>{sessionState.temporaryMaximumHpBonus > 0 && <small>Includes Aid +{sessionState.temporaryMaximumHpBonus}</small>}<OverrideReason override={draftCharacter.manualOverrides.maximumHp} /></div><label><span>Temporary</span><input type="number" aria-label="Temporary hit points" value={sessionState.temporaryHp} min="0" onChange={(event) => { const value = event.currentTarget.valueAsNumber; setSessionState((current) => setTemporaryHp(current, Number.isFinite(value) ? value : 0)); }} /></label></div><label className="aid-control" title="Adding or removing Aid adjusts current HP by the same amount. Increase this by 5 for each spell-slot level above 2."><span>Aid</span><input type="number" aria-label="Aid maximum HP bonus" min="0" step="5" value={sessionState.temporaryMaximumHpBonus} onChange={(event) => { const value = event.currentTarget.valueAsNumber; const nextBonus = Number.isFinite(value) ? value : 0; setSessionState((current) => { const updated = setTemporaryMaximumHpBonus(current, nextBonus); return setCurrentHp(updated, current.currentHp + updated.temporaryMaximumHpBonus - current.temporaryMaximumHpBonus, baseMaximumHp + updated.temporaryMaximumHpBonus); }); }} /></label></Section>
          <Section title="Play state"><div className="play-state-controls"><div className="play-state-primary"><label className="inspiration-control"><input type="checkbox" checked={sessionState.inspiration} onChange={(event) => { const inspiration = event.currentTarget.checked; setSessionState((current) => ({ ...current, inspiration })); }} /> Inspiration</label><fieldset className="death-saves"><legend>Death saves</legend><div className="death-save-row"><span>Success</span>{([0, 1, 2] as const).map((index) => <label key={`success-${index}`}><input className="death-save-success" type="checkbox" aria-label={`Death save success ${index + 1}`} checked={sessionState.deathSaveSuccesses > index} onChange={(event) => setDeathSave('deathSaveSuccesses', index, event.currentTarget.checked)} /><span aria-hidden="true">×</span></label>)}</div><div className="death-save-row"><span>Fails</span>{([0, 1, 2] as const).map((index) => <label key={`failure-${index}`}><input className="death-save-failure" type="checkbox" aria-label={`Death save failure ${index + 1}`} checked={sessionState.deathSaveFailures > index} onChange={(event) => setDeathSave('deathSaveFailures', index, event.currentTarget.checked)} /><span aria-hidden="true">×</span></label>)}</div></fieldset></div><div className="play-state-secondary"><form onSubmit={(event) => { event.preventDefault(); const condition = conditionName.trim(); if (condition && !sessionState.conditions.includes(condition)) setSessionState((current) => ({ ...current, conditions: [...current.conditions, condition] })); setConditionName(''); }}><label htmlFor="condition-name">Condition</label><input id="condition-name" value={conditionName} onChange={(event) => setConditionName(event.currentTarget.value)} /><button type="submit">Add</button></form><ul className="condition-list">{sessionState.conditions.map((condition) => <li key={condition}>{condition}<button type="button" aria-label={`Remove ${condition}`} onClick={() => setSessionState((current) => ({ ...current, conditions: current.conditions.filter((entry) => entry !== condition) }))}>Remove</button></li>)}</ul><div className="rest-actions"><button type="button" onClick={() => setPendingRest('short')}>Short rest</button><button type="button" onClick={() => setPendingRest('long')}>Long rest</button></div></div></div></Section>
          <Section title="Attacks"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Attack</th><th>Damage</th><th>Notes</th></tr></thead><tbody>{details.attacks.map((attack) => <tr key={attack.name}><td>{attack.name}</td><td>{signed(attack.attackBonus)}</td><td>{attack.damage}</td><td>{attack.notes ?? '-'}</td></tr>)}</tbody></table></div></Section>
          <Section title="Cantrips"><ul className="card-list">{sheet.cantrips.map((spell) => <li key={spell.id}><strong>{spell.name}</strong><span>{spell.scalingBasis ? `Scales by ${spell.scalingBasis.replace('-', ' ')}` : 'No scaling recorded'}</span></li>)}</ul></Section>
          <Section title="Spell slots"><ul className="card-list">{details.spellSlots.map(({ level, maximum }) => { const used = sessionState.usedSpellSlots[level] ?? 0; return <li key={level}><strong>Level {level}</strong><span>{maximum - used} / {maximum} remaining</span><div className="resource-actions"><button type="button" aria-label={`Use level ${level} spell slot`} disabled={used === maximum} onClick={() => setSessionState((current) => setSpellSlotUses(current, level, used + 1, maximum))}>Use slot</button><button type="button" className="resource-restore" aria-label={`Restore level ${level} spell slot`} disabled={used === 0} onClick={() => setSessionState((current) => setSpellSlotUses(current, level, used - 1, maximum))}>Restore slot</button></div></li>; })}</ul></Section>
          <Section title="Spells"><ul className="card-list">{sheet.spells.map(({ spell, prepared }) => <li key={spell.id}><strong>{spell.name}</strong><span>Level {spell.level} / {prepared ? 'Prepared' : 'Known'}</span></li>)}</ul></Section>
        </div>

        <div className="sheet-column">
          <Section title="Features"><ul className="card-list">{sheet.features.map((feature) => <li key={feature.id}><strong>{feature.name}</strong><span>{titleCase(feature.automation)} automation</span></li>)}</ul></Section>
          <Section title="Resources"><ul className="card-list">{sheet.resources.map(({ resource, used }) => <li key={resource.id}><strong>{resource.name}</strong><span>{resource.maximum - used} / {resource.maximum} remaining / {titleCase(resource.recharge)}</span><div className="resource-actions"><button type="button" aria-label={`Use ${resource.name}`} disabled={used === resource.maximum} onClick={() => setSessionState((current) => setResourceUses(current, resource, used + 1))}>Use</button><button type="button" className="resource-restore" aria-label={`Restore ${resource.name}`} disabled={used === 0} onClick={() => setSessionState((current) => setResourceUses(current, resource, used - 1))}>Restore use</button></div></li>)}</ul></Section>
          <Section title="Spellcasting"><dl className="spellcasting-values"><div><dt>Attack bonus <OverrideButton label="spell attack bonus" active={Boolean(draftCharacter.manualOverrides.spellAttackBonus)} onClick={() => setEditingOverride('spellAttackBonus')} /></dt><dd>{signed(resolveManualOverride(baseCalculation(combat.spellAttackBonus, 'Calculated spell attack bonus'), draftCharacter.manualOverrides, 'spellAttackBonus').value)}</dd><OverrideReason override={draftCharacter.manualOverrides.spellAttackBonus} /></div><div><dt>Save DC <OverrideButton label="spell save DC" active={Boolean(draftCharacter.manualOverrides.spellSaveDc)} onClick={() => setEditingOverride('spellSaveDc')} /></dt><dd>{resolveManualOverride(baseCalculation(combat.spellSaveDc, 'Calculated spell save DC'), draftCharacter.manualOverrides, 'spellSaveDc').value}</dd><OverrideReason override={draftCharacter.manualOverrides.spellSaveDc} /></div></dl></Section>
        </div>
      </div>}

      {activeTab === 'inventory' && <div className="tab-panel" role="tabpanel" id="inventory-panel" aria-labelledby="inventory-tab"><Section title="Inventory"><ul className="inventory-list">{character.inventory.map((entry) => <li key={entry.itemId}><strong>{details.inventory[entry.itemId] ?? entry.itemId}</strong><span>Quantity {entry.quantity}</span></li>)}</ul></Section></div>}

      {activeTab === 'character' && <div className="tab-panel character-panel" role="tabpanel" id="character-panel" aria-labelledby="character-tab">
        <Section title="Appearance"><div className="appearance-summary"><div className="portrait-placeholder" aria-label="Portrait placeholder for Ariel Thorne">{character.name.split(' ').map((name) => name[0]).join('')}</div><div><p><strong>Pronouns:</strong> {details.appearance.pronouns}</p><p>{details.appearance.description}</p></div></div></Section>
        <Section title="Backstory"><p className="backstory">{details.backstory}</p></Section>
        <Section title="Notes"><div className="notes-list">{details.notes.map((note) => <article key={note.title}><h3>{note.title}</h3><p>{note.content}</p></article>)}</div></Section>
      </div>}
      {pendingRest && <div className="dialog-backdrop" role="presentation"><section className="rest-dialog" role="dialog" aria-modal="true" aria-labelledby="rest-dialog-title"><h2 id="rest-dialog-title">Confirm {pendingRest} rest</h2><p>Has the DM confirmed this {pendingRest} rest?</p><div><button type="button" onClick={() => setPendingRest(null)}>Cancel</button><button type="button" onClick={() => { setSessionState((current) => takeRest(current, sheet.resources.map(({ resource }) => resource), pendingRest, maximumHp)); setPendingRest(null); }}>DM confirmed {pendingRest} rest</button></div></section></div>}
      {editingOverride && <OverrideDialog target={editingOverride} label={overrideDetails[editingOverride].label} calculatedValue={overrideDetails[editingOverride].calculatedValue} override={draftCharacter.manualOverrides[editingOverride]} onSave={changeOverride} onReset={(target) => changeOverride(target)} onClose={() => setEditingOverride(null)} />}
    </main>
  );
}
