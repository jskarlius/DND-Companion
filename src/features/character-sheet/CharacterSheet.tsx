import { useEffect, useRef, useState } from 'react';
import { resolveManualOverride } from '../../domain/character/calculations';
import { hitDiceRecoveryLimit, setCurrentHp, setResourceUses, setSpellSlotUses, setTemporaryHp, setTemporaryMaximumHpBonus, takeRest } from '../../domain/character/playState';
import type { Character, CharacterPlayState, ManualOverride, ManualOverrideTarget } from '../../domain/character/types';
import type { ContentFixture } from '../../domain/content/types';
import type { CharacterSheetDetails } from './characterSheetFixture';
import { buildCharacterSheetViewModel, titleCase } from './characterSheetViewModel';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CollapsibleSection as Section } from './CollapsibleSection';
import { LevelUpDialog } from './LevelUpDialog';
import { AbilityScoreDialog } from './AbilityScoreDialog';
import './CharacterSheet.css';

interface CharacterSheetProps {
  readonly character: Parameters<typeof buildCharacterSheetViewModel>[0];
  readonly playState: CharacterPlayState;
  readonly content: ContentFixture;
  readonly details: CharacterSheetDetails;
  readonly onCharacterChange?: (character: Character) => void;
  readonly onPlayStateChange?: (playState: CharacterPlayState) => void;
  readonly onAdvancementCommit?: (character: Character, playState: CharacterPlayState) => Promise<void> | void;
}

type SheetTab = 'sheet' | 'spells' | 'character' | 'inventory';

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function abilityAbbreviation(ability: string): string {
  return ability.slice(0, 3).toUpperCase();
}

function inventoryLabel(itemId: string, labels: Readonly<Record<string, string>>): string {
  if (labels[itemId]) return labels[itemId];
  const label = itemId.split(':').at(-1)?.replaceAll('-', ' ') ?? itemId;
  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function baseCalculation(value: number, label: string) {
  return { value, terms: [{ label, operation: 'base' as const, value }] };
}

function OverrideButton({ label, active, onClick }: { readonly label: string; readonly active: boolean; readonly onClick: (trigger: HTMLButtonElement) => void }) {
  return <button type="button" className={`override-button${active ? ' override-active' : ''}`} aria-label={`Override ${label}`} title={`Override ${label}`} onClick={(event) => onClick(event.currentTarget)}><span aria-hidden="true">{'\u2699'}</span></button>;
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
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="override-dialog" onCloseAutoFocus={(event) => event.preventDefault()}><DialogTitle>Override {label}</DialogTitle><DialogDescription>Calculated value: <strong>{calculatedValue}</strong></DialogDescription><label>Override value<input type="number" aria-label={`${label} override value`} value={value} onChange={(event) => setValue(event.currentTarget.value)} /></label><label>Reason <span>(optional)</span><textarea aria-label={`${label} override reason`} value={reason} onChange={(event) => setReason(event.currentTarget.value)} /></label><footer>{override && <Button type="button" variant="destructive" className="mr-auto" onClick={() => { onReset(target); onClose(); }}>Remove override</Button>}<Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" onClick={() => { const numericValue = Number(value); if (Number.isFinite(numericValue)) { onSave(target, { value: numericValue, reason: reason.trim() || undefined }); onClose(); } }}>Save override</Button></footer></DialogContent></Dialog>;
}

export function CharacterSheet({ character, playState, content, details, onCharacterChange, onPlayStateChange, onAdvancementCommit }: CharacterSheetProps) {
  const [draftCharacter, setDraftCharacter] = useState(character);
  const [sessionState, setSessionState] = useState(playState);
  const previousCharacter = useRef(draftCharacter);
  const previousPlayState = useRef(sessionState);
  const [conditionName, setConditionName] = useState('');
  const [pendingRest, setPendingRest] = useState<'short' | 'long' | null>(null);
  const [pendingHitDice, setPendingHitDice] = useState<Record<string, number>>({});
  const [editingOverride, setEditingOverride] = useState<ManualOverrideTarget | null>(null);
  const lastOverrideTrigger = useRef<HTMLButtonElement | null>(null);
  const sheet = buildCharacterSheetViewModel(draftCharacter, sessionState, content, details);
  const { combat } = details;
  const [activeTab, setActiveTab] = useState<SheetTab>('sheet');
  const tabs: readonly SheetTab[] = sheet.spellcasting.length > 0
    ? ['sheet', 'spells', 'character', 'inventory']
    : ['sheet', 'character', 'inventory'];
  const armorClass = resolveManualOverride(baseCalculation(combat.armorClass, 'Calculated armor class'), draftCharacter.manualOverrides, 'armorClass').value;
  const speed = resolveManualOverride(baseCalculation(combat.speed, 'Calculated speed'), draftCharacter.manualOverrides, 'speed').value;
  const baseMaximumHp = resolveManualOverride(baseCalculation(combat.maximumHp, 'Calculated maximum HP'), draftCharacter.manualOverrides, 'maximumHp').value;
  const maximumHp = baseMaximumHp + sessionState.temporaryMaximumHpBonus;
  const hitDiceGroups = sheet.hitDiceGroups;
  const hitDiceRecovery = draftCharacter.longRestHitDiceRecovery;
  const hitDiceRecoveryLimitValue = hitDiceRecoveryLimit(hitDiceGroups.map(({ classEntryId, maximum }) => ({ classEntryId, maximum })), hitDiceRecovery);
  const usedHitDice = hitDiceGroups.reduce((total, group) => total + group.used, 0);
  const hitDiceSummary = hitDiceGroups.map((group) => `${group.maximum}d${group.die}`).join(' + ');
  const spellLevels = [...new Set([
    ...sheet.spellSlots.map(({ level }) => level),
    ...sheet.spells.map(({ spell }) => spell.level),
    ...sheet.cantrips.map(() => 0),
  ])].sort((left, right) => left - right);

  useEffect(() => {
    if (previousCharacter.current !== draftCharacter) onCharacterChange?.(draftCharacter);
    previousCharacter.current = draftCharacter;
  }, [draftCharacter, onCharacterChange]);

  useEffect(() => {
    if (previousPlayState.current !== sessionState) onPlayStateChange?.(sessionState);
    previousPlayState.current = sessionState;
  }, [onPlayStateChange, sessionState]);

  useEffect(() => {
    previousCharacter.current = character;
    setDraftCharacter(character);
  }, [character]);

  useEffect(() => {
    previousPlayState.current = playState;
    setSessionState(playState);
  }, [playState]);

  useEffect(() => {
    if (editingOverride !== null && document.activeElement instanceof HTMLButtonElement) {
      lastOverrideTrigger.current = document.activeElement;
    } else if (editingOverride === null) {
      lastOverrideTrigger.current?.focus();
    }
  }, [editingOverride]);

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

  const setSpellPrepared = (spellId: string, prepared: boolean) => {
    setDraftCharacter((current) => ({
      ...current,
      spellSelections: (() => {
        const classEntryId = current.classes.find((entry) => content.classes.find((candidate) => candidate.id === entry.classId)?.spellListIds.includes(spellId))?.id ?? '';
        const selection = current.spellSelections.find((entry) => entry.spellId === spellId && entry.classEntryId === classEntryId);
        if (selection) return current.spellSelections.map((entry) => entry === selection ? { ...entry, prepared } : entry);
        return prepared ? [...current.spellSelections, { spellId, classEntryId, acquiredAtClassLevel: current.classes.find((entry) => entry.id === classEntryId)?.level ?? 1, prepared: true }] : current.spellSelections;
      })(),
      preparedSpellIds: prepared
        ? current.preparedSpellIds.includes(spellId) ? current.preparedSpellIds : [...current.preparedSpellIds, spellId]
        : current.preparedSpellIds.filter((id) => id !== spellId),
    }));
  };

  useEffect(() => {
    if (!pendingRest) return;
    setPendingHitDice(pendingRest === 'short'
      ? Object.fromEntries(hitDiceGroups.map((group) => [group.classEntryId, group.used]))
      : {});
  }, [pendingRest]);

  const confirmRest = () => {
    if (!pendingRest) return;
    setSessionState((current) => {
      const beforeRest = pendingRest === 'short'
        ? { ...current, usedHitDice: { ...current.usedHitDice, ...pendingHitDice } }
        : current;
      return takeRest(
        beforeRest,
        sheet.resources.map(({ resource }) => resource),
        pendingRest,
        maximumHp,
        hitDiceGroups.map(({ classEntryId, maximum }) => ({ classEntryId, maximum })),
        hitDiceRecovery,
        pendingHitDice,
      );
    });
    setPendingRest(null);
  };

  return (
    <main className="character-sheet">
      <header className="sheet-header">
        <div><p className="eyebrow">{character.ruleset.replace('e-', 'th edition ')}</p><h1>{character.name}</h1>{onAdvancementCommit && <LevelUpDialog character={draftCharacter} playState={sessionState} content={content} onCommit={onAdvancementCommit} />}</div>
        <dl className="identity-list">
          <div className="identity-classes"><dt>Classes</dt><dd>{sheet.classes.map((entry) => `${entry.name} ${entry.level}`).join(' / ')}</dd></div>
          <div><dt>Species</dt><dd>{details.identity.species}</dd></div>
          <div><dt>Background</dt><dd>{details.identity.background}</dd></div>
          <div><dt>Player</dt><dd>{details.identity.playerName}</dd></div>
        </dl>
      </header>

      <section className="summary-grid" aria-label="Character summary">
        <div><span>Level</span><strong>{sheet.totalLevel}</strong></div>
        <div><span>Proficiency</span><strong>{signed(sheet.proficiencyBonus)}</strong></div>
        <div><span>Armor Class <OverrideButton label="armor class" active={Boolean(draftCharacter.manualOverrides.armorClass)} onClick={(trigger) => { lastOverrideTrigger.current = trigger; setEditingOverride('armorClass'); }} /></span><strong>{armorClass}</strong><OverrideReason override={draftCharacter.manualOverrides.armorClass} /></div>
        <div><span>Speed <OverrideButton label="speed" active={Boolean(draftCharacter.manualOverrides.speed)} onClick={(trigger) => { lastOverrideTrigger.current = trigger; setEditingOverride('speed'); }} /></span><strong>{speed} ft.</strong><OverrideReason override={draftCharacter.manualOverrides.speed} /></div>
        <div className="hit-dice-summary"><span>Hit Dice</span><strong>{usedHitDice} / {sheet.totalLevel} used</strong><details className="max-hp-effects"><summary>{hitDiceSummary}</summary><div className="hit-dice-groups">{hitDiceGroups.map((group) => <span key={group.classEntryId}>{group.className}: {group.used} / {group.maximum} d{group.die} used</span>)}</div><label className="aid-control"><span>Long-rest recovery</span><select aria-label="Long-rest hit-dice recovery" value={hitDiceRecovery} onChange={(event) => setDraftCharacter((current) => ({ ...current, longRestHitDiceRecovery: event.currentTarget.value as typeof current.longRestHitDiceRecovery }))}><option value="2024-all">2024: all spent dice</option><option value="2014-half">2014: half total dice</option></select></label></details></div>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
      <TabsList className="sheet-tabs" aria-label="Character sheet sections">
        {tabs.map((tab, index) => (
          <TabsTrigger key={tab} value={tab} className={activeTab === tab ? 'active-tab' : undefined} onKeyDown={(event) => {
            const targetIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
              : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : undefined;
            if (targetIndex === undefined) return;
            event.preventDefault();
            setActiveTab(tabs[targetIndex]);
            const triggers = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
            triggers[targetIndex]?.focus();
          }}>
            {titleCase(tab)}
          </TabsTrigger>
        ))}
      </TabsList>

      {activeTab === 'spells' && <p className="spell-count-summary"><span>Cantrips {sheet.cantrips.length}{sheet.spellLimits && ` / ${sheet.spellLimits.cantripsKnown}`}</span><span>Known spells {sheet.spells.length}</span><span>Prepared {sheet.spells.filter(({ prepared }) => prepared).length}{sheet.spellLimits && ` / ${sheet.spellLimits.preparedSpells}`}</span></p>}

      <TabsContent value="sheet" className="sheet-grid">
        <div className="sheet-column">
          <Section title="Abilities"><div className="ability-section-actions"><AbilityScoreDialog scores={draftCharacter.abilityScores} generation={draftCharacter.abilityScoreGeneration} onSave={(abilityScores, abilityScoreGeneration) => setDraftCharacter((current) => ({ ...current, abilityScores, abilityScoreGeneration }))} /></div><dl className="ability-grid">{sheet.abilities.map(({ ability, score, modifier }) => <div key={ability}><dt aria-label={titleCase(ability)}><abbr title={titleCase(ability)}>{abilityAbbreviation(ability)}</abbr></dt><dd>{score}<small>{signed(modifier)}</small></dd></div>)}</dl></Section>
          <Section title="Saving throws"><ul className="check-list">{sheet.savingThrows.map(({ ability, value, proficient }) => <li key={ability}><span aria-label={`${titleCase(ability)} saving throw${proficient ? ', proficient' : ''}`} className={proficient ? 'proficient-marker' : 'marker'}>{proficient ? '\u25cf' : '\u25cb'}</span><b>{signed(value)}</b>{titleCase(ability)}</li>)}</ul></Section>
          <Section title="Skills"><ul className="check-list skill-list">{sheet.skills.map(({ skill, value, proficiency }) => <li key={skill}><span aria-label={`${titleCase(skill)}: ${proficiency}`} className={proficiency === 'none' ? 'marker' : 'proficient-marker'}>{proficiency === 'expertise' ? '\u25c6' : proficiency === 'proficient' ? '\u25cf' : '\u25cb'}</span><b>{signed(value)}</b>{titleCase(skill)}{proficiency === 'expertise' && <em>Expertise</em>}</li>)}</ul></Section>
        </div>

        <div className="sheet-column sheet-column-wide">
          <Section title="Hit points" className="hit-points-section"><div className="hit-points"><label><span>Current</span><input type="number" aria-label="Current hit points" value={sessionState.currentHp} min="0" max={maximumHp} onChange={(event) => { const value = event.currentTarget.valueAsNumber; setSessionState((current) => setCurrentHp(current, Number.isFinite(value) ? value : 0, maximumHp)); }} /></label><div className="maximum-hp-card"><span>Maximum <OverrideButton label="maximum HP" active={Boolean(draftCharacter.manualOverrides.maximumHp)} onClick={() => setEditingOverride('maximumHp')} /></span><strong>{maximumHp}</strong>{sessionState.temporaryMaximumHpBonus > 0 && <small>Includes Aid +{sessionState.temporaryMaximumHpBonus}</small>}<OverrideReason override={draftCharacter.manualOverrides.maximumHp} /><details className="max-hp-effects"><summary>Max HP effects</summary><label className="aid-control" title="Adding or removing Aid adjusts current HP by the same amount. Increase this by 5 for each spell-slot level above 2."><span>Aid bonus</span><input type="number" aria-label="Aid maximum HP bonus" min="0" step="5" value={sessionState.temporaryMaximumHpBonus} onChange={(event) => { const value = event.currentTarget.valueAsNumber; const nextBonus = Number.isFinite(value) ? value : 0; setSessionState((current) => { const updated = setTemporaryMaximumHpBonus(current, nextBonus); return setCurrentHp(updated, current.currentHp + updated.temporaryMaximumHpBonus - current.temporaryMaximumHpBonus, baseMaximumHp + updated.temporaryMaximumHpBonus); }); }} /></label></details></div><label><span>Temporary</span><input type="number" aria-label="Temporary hit points" value={sessionState.temporaryHp} min="0" onChange={(event) => { const value = event.currentTarget.valueAsNumber; setSessionState((current) => setTemporaryHp(current, Number.isFinite(value) ? value : 0)); }} /></label></div></Section>
          <Section title="Play state"><div className="play-state-controls"><div className="play-state-cluster"><h3>Status</h3><label className="inspiration-control"><input type="checkbox" checked={sessionState.inspiration} onChange={(event) => { const inspiration = event.currentTarget.checked; setSessionState((current) => ({ ...current, inspiration })); }} /> Inspiration</label><form onSubmit={(event) => { event.preventDefault(); const condition = conditionName.trim(); if (condition && !sessionState.conditions.includes(condition)) setSessionState((current) => ({ ...current, conditions: [...current.conditions, condition] })); setConditionName(''); }}><label htmlFor="condition-name">Condition</label><input id="condition-name" value={conditionName} onChange={(event) => setConditionName(event.currentTarget.value)} /><button type="submit">Add</button></form><ul className="condition-list">{sessionState.conditions.map((condition) => <li key={condition}>{condition}<button type="button" aria-label={`Remove ${condition}`} onClick={() => setSessionState((current) => ({ ...current, conditions: current.conditions.filter((entry) => entry !== condition) }))}>Remove</button></li>)}</ul></div><div className="play-state-cluster death-saves" role="group" aria-labelledby="death-saves-heading"><h3 id="death-saves-heading">Death saves</h3><div className="death-save-row"><span>Failure</span><div className="death-save-boxes">{([0, 1, 2] as const).map((index) => <label key={`failure-${index}`}><input className="death-save-failure" type="checkbox" aria-label={`Death save failure ${index + 1}`} checked={sessionState.deathSaveFailures > index} onChange={(event) => setDeathSave('deathSaveFailures', index, event.currentTarget.checked)} /></label>)}</div></div><div className="death-save-row"><span>Success</span><div className="death-save-boxes">{([0, 1, 2] as const).map((index) => <label key={`success-${index}`}><input className="death-save-success" type="checkbox" aria-label={`Death save success ${index + 1}`} checked={sessionState.deathSaveSuccesses > index} onChange={(event) => setDeathSave('deathSaveSuccesses', index, event.currentTarget.checked)} /></label>)}</div></div><p className="death-save-bonus">No applicable bonus recorded.</p></div><div className="play-state-cluster rest-cluster"><h3>Rest</h3><p>Apply recovery only after the DM confirms a rest.</p><div className="rest-actions"><button type="button" onClick={() => setPendingRest('short')}>Short rest</button><button type="button" onClick={() => setPendingRest('long')}>Long rest</button></div></div></div></Section>
          <Section title="Attacks"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Attack</th><th>Damage</th><th>Notes</th></tr></thead><tbody>{details.attacks.map((attack) => <tr key={attack.name}><td>{attack.name}</td><td>{signed(attack.attackBonus)}</td><td>{attack.damage}</td><td>{attack.notes ?? '-'}</td></tr>)}</tbody></table></div></Section>
        </div>

        <div className="sheet-column">
          <Section title="Features"><ul className="card-list">{sheet.features.map((feature) => <li key={feature.id}><strong>{feature.name}</strong><span>{titleCase(feature.automation)} automation</span></li>)}</ul></Section>
          <Section title="Resources"><ul className="card-list">{sheet.resources.map(({ resource, used }) => <li key={resource.id}><strong>{resource.name}</strong><span>{resource.maximum - used} / {resource.maximum} remaining / {titleCase(resource.recharge)}</span><div className="resource-actions"><button type="button" aria-label={`Use ${resource.name}`} disabled={used === resource.maximum} onClick={() => setSessionState((current) => setResourceUses(current, resource, used + 1))}>Use</button><button type="button" className="resource-restore" aria-label={`Restore ${resource.name}`} disabled={used === 0} onClick={() => setSessionState((current) => setResourceUses(current, resource, used - 1))}>Restore use</button></div></li>)}</ul></Section>
        </div>
      </TabsContent>

      {sheet.spellcasting.length > 0 && <TabsContent value="spells" className="spells-tab"><Section title="Spells" className="spells-section"><dl className="spellcasting-values"><div><dt>Attack bonus <OverrideButton label="spell attack bonus" active={Boolean(draftCharacter.manualOverrides.spellAttackBonus)} onClick={() => setEditingOverride('spellAttackBonus')} /></dt><dd>{signed(resolveManualOverride(baseCalculation(combat.spellAttackBonus, 'Calculated spell attack bonus'), draftCharacter.manualOverrides, 'spellAttackBonus').value)}</dd><OverrideReason override={draftCharacter.manualOverrides.spellAttackBonus} /></div><div><dt>Save DC <OverrideButton label="spell save DC" active={Boolean(draftCharacter.manualOverrides.spellSaveDc)} onClick={() => setEditingOverride('spellSaveDc')} /></dt><dd>{resolveManualOverride(baseCalculation(combat.spellSaveDc, 'Calculated spell save DC'), draftCharacter.manualOverrides, 'spellSaveDc').value}</dd><OverrideReason override={draftCharacter.manualOverrides.spellSaveDc} /></div><div><dt>Spellcasting ability</dt><dd>{sheet.spellcasting.map(({ className, ability }) => `${className}: ${titleCase(ability)}`).join(' / ')}</dd></div></dl><div className="spell-level-groups">{spellLevels.map((level) => { const slot = sheet.spellSlots.find((entry) => entry.level === level); const used = slot ? sessionState.usedSpellSlots[level] ?? 0 : 0; const spells = level === 0 ? sheet.cantrips.map((spell) => ({ spell, prepared: false })) : sheet.spells.filter(({ spell }) => spell.level === level); return <details className="spell-level-group" key={level} open><summary><h3>{level === 0 ? 'Cantrips' : `Level ${level}`}</h3>{slot && <span className="spell-slot-tracker" aria-label={`${slot.label}, level ${level}`}><span>{slot.maximum} total / {used} used</span><Button type="button" variant="secondary" className="spell-slot-action" aria-label={`Restore level ${level} spell slot`} disabled={used === 0} onClick={(event) => { event.preventDefault(); setSessionState((current) => setSpellSlotUses(current, level, used - 1, slot.maximum)); }}>Restore</Button><Button type="button" className="spell-slot-action" aria-label={`Use level ${level} spell slot`} disabled={used === slot.maximum} onClick={(event) => { event.preventDefault(); setSessionState((current) => setSpellSlotUses(current, level, used + 1, slot.maximum)); }}>Spend</Button></span>}</summary>{spells.length > 0 ? <ul>{spells.map(({ spell, prepared }) => { const components = [spell.components?.verbal ? 'V' : undefined, spell.components?.somatic ? 'S' : undefined, spell.components?.material ? `M (${spell.components.material})` : undefined].filter(Boolean).join(', '); const spellDetails = [spell.castingTime, spell.range, components || undefined, spell.duration, spell.concentration ? 'Concentration' : undefined, spell.ritual ? 'Ritual' : undefined, spell.scalingBasis ? `Scales by ${spell.scalingBasis.replace('-', ' ')}` : undefined].filter(Boolean).join(' \u00b7 '); return <li key={spell.id}>{spell.level === 0 ? <span className="cantrip-marker" aria-label="Cantrip">Cantrip</span> : <label className="spell-prepared"><input type="checkbox" aria-label={`Prepare ${spell.name}`} checked={prepared} onChange={(event) => setSpellPrepared(spell.id, event.currentTarget.checked)} /><span aria-hidden="true">Prepared</span></label>}<strong>{spell.name}</strong>{spellDetails && <span className="spell-details">{spellDetails}</span>}{spell.description && <details className="spell-reference"><summary>View description</summary><p>{spell.description}</p>{spell.higherLevelDescription && <p><strong>At higher levels.</strong> {spell.higherLevelDescription}</p>}</details>}</li>; })}</ul> : <p className="empty-spell-level">No spells recorded.</p>}</details>; })}</div></Section></TabsContent>}

      <TabsContent value="inventory" className="tab-panel"><Section title="Inventory"><ul className="inventory-list">{character.inventory.map((entry) => <li key={entry.itemId}><strong>{inventoryLabel(entry.itemId, details.inventory)}</strong><span>Quantity {entry.quantity}</span></li>)}</ul></Section></TabsContent>

      <TabsContent value="character" className="tab-panel character-panel">
        <Section title="Appearance"><div className="appearance-summary"><div className="portrait-placeholder" aria-label={`Portrait placeholder for ${character.name}`}>{character.name.split(' ').map((name) => name[0]).join('')}</div><div><p><strong>Pronouns:</strong> {details.appearance.pronouns}</p><p>{details.appearance.description}</p></div></div></Section>
        <Section title="Backstory"><p className="backstory">{details.backstory}</p></Section>
        <Section title="Notes"><div className="notes-list">{details.notes.map((note) => <article key={note.title}><h3>{note.title}</h3><p>{note.content}</p></article>)}</div></Section>
      </TabsContent>
      </Tabs>
      {pendingRest && <Dialog open onOpenChange={(open) => { if (!open) setPendingRest(null); }}><DialogContent className="rest-dialog"><DialogTitle>Confirm {pendingRest} rest</DialogTitle><DialogDescription>Has the DM confirmed this {pendingRest} rest?</DialogDescription>{pendingRest === 'short' ? <div className="hit-dice-rest-controls"><p>Spend Hit Point Dice after the rest. Record healing manually after rolling.</p>{hitDiceGroups.map((group) => { const used = pendingHitDice[group.classEntryId] ?? group.used; return <div key={group.classEntryId}><span>{group.className} d{group.die}: {used} / {group.maximum} used</span><Button type="button" disabled={used === group.maximum} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: Math.min(group.maximum, (current[group.classEntryId] ?? group.used) + 1) }))}>Spend d{group.die}</Button><Button type="button" variant="secondary" disabled={used === 0} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: Math.max(0, (current[group.classEntryId] ?? group.used) - 1) }))}>Undo</Button></div>; })}</div> : hitDiceRecovery === '2014-half' ? <div className="hit-dice-rest-controls"><p>2014 table rule: restore up to {hitDiceRecoveryLimitValue} spent Hit Point Dice. Choose the groups to restore.</p>{hitDiceGroups.map((group) => { const restored = pendingHitDice[group.classEntryId] ?? 0; const alreadyAllocated = Object.values(pendingHitDice).reduce((total, value) => total + value, 0); return <div key={group.classEntryId}><span>{group.className} d{group.die}: {group.used} used, {restored} restoring</span><Button type="button" disabled={restored >= group.used || alreadyAllocated >= hitDiceRecoveryLimitValue} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: (current[group.classEntryId] ?? 0) + 1 }))}>Restore one</Button><Button type="button" variant="secondary" disabled={restored === 0} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: Math.max(0, (current[group.classEntryId] ?? 0) - 1) }))}>Undo</Button></div>; })}</div> : <p>2024 rules: this Long Rest restores all spent Hit Point Dice.</p>}<div><Button type="button" variant="secondary" onClick={() => setPendingRest(null)}>Cancel</Button><Button type="button" onClick={confirmRest}>DM confirmed {pendingRest} rest</Button></div></DialogContent></Dialog>}
      {editingOverride && <OverrideDialog target={editingOverride} label={overrideDetails[editingOverride].label} calculatedValue={overrideDetails[editingOverride].calculatedValue} override={draftCharacter.manualOverrides[editingOverride]} onSave={changeOverride} onReset={(target) => changeOverride(target)} onClose={() => setEditingOverride(null)} />}
    </main>
  );
}
