import { useEffect, useRef, useState } from 'react';
import { resolveManualOverride } from '../../domain/character/calculations';
import { hitDiceRecoveryLimit, setCurrentHp, setResourceUses, setSpellSlotUses, setTemporaryHp, setTemporaryMaximumHpBonus, takeRest } from '../../domain/character/playState';
import { ABILITIES, EMPTY_CURRENCY_PURSE, SKILLS, type Ability, type Character, type CharacterPlayState, type ManualOverride, type ManualOverrideTarget, type ProficiencyOverride, type Skill, type SkillProficiency } from '../../domain/character/types';
import type { ContentFixture } from '../../domain/content/types';
import type { CharacterSheetDetails } from './characterSheetFixture';
import { buildCharacterSheetViewModel, titleCase } from './characterSheetViewModel';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { CollapsibleSection as Section } from './CollapsibleSection';
import { LevelUpDialog } from './LevelUpDialog';
import { AbilityScoreDialog } from './AbilityScoreDialog';
import { SpellTab } from './SpellTab';
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
type ProficiencyOverrideTarget = { readonly kind: 'skill'; readonly id: Skill } | { readonly kind: 'savingThrow'; readonly id: Ability };
type ProficiencySection = 'skills' | 'savingThrows';

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

function ProficiencyMarker({ value, label }: { readonly value: 'none' | 'proficient' | 'expertise'; readonly label?: string }) {
  return <span className={`proficiency-marker proficiency-marker--${value}`} aria-hidden={label ? undefined : true} aria-label={label} />;
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

function ProficiencyOverrideDialog({ target, calculated, override, onSave, onReset, onClose }: { readonly target: ProficiencyOverrideTarget; readonly calculated: string; readonly override?: ProficiencyOverride<string>; readonly onSave: (value: string, reason?: string) => void; readonly onReset: () => void; readonly onClose: () => void }) {
  const [value, setValue] = useState(override?.value ?? calculated);
  const [reason, setReason] = useState(override?.reason ?? '');
  const label = `${titleCase(target.id)} ${target.kind === 'skill' ? 'skill' : 'saving throw'}`;
  const values = target.kind === 'skill' ? ['none', 'proficient', 'expertise'] : ['none', 'proficient'];
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="override-dialog" onCloseAutoFocus={(event) => event.preventDefault()}><DialogTitle>Override {label}</DialogTitle><DialogDescription>Calculated proficiency: <strong>{calculated}</strong></DialogDescription><label>Proficiency<select aria-label={`${label} override value`} value={value} onChange={(event) => setValue(event.currentTarget.value)}>{values.map((entry) => <option key={entry} value={entry}>{titleCase(entry)}</option>)}</select></label><label>Reason <span>(optional)</span><textarea aria-label={`${label} override reason`} value={reason} onChange={(event) => setReason(event.currentTarget.value)} /></label><footer>{override && <Button type="button" variant="destructive" className="mr-auto" onClick={() => { onReset(); onClose(); }}>Remove override</Button>}<Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" onClick={() => { onSave(value, reason.trim() || undefined); onClose(); }}>Save override</Button></footer></DialogContent></Dialog>;
}

function ProficiencySectionDialog({ section, character, onSave, onClose }: { readonly section: ProficiencySection; readonly character: Character; readonly onSave: (values: Record<string, string>) => void; readonly onClose: () => void }) {
  const ids = section === 'skills' ? SKILLS : ABILITIES;
  const [values, setValues] = useState<Record<string, string>>(() => section === 'skills'
    ? Object.fromEntries(SKILLS.map((skill) => [skill, character.proficiencyOverrides?.skills[skill]?.value ?? character.proficiencies.skills[skill] ?? 'none']))
    : Object.fromEntries(ABILITIES.map((ability) => [ability, character.proficiencyOverrides?.savingThrows[ability]?.value ?? (character.proficiencies.savingThrowAbilities.includes(ability) ? 'proficient' : 'none')])));
  const cycle = (id: string) => setValues((existing) => ({ ...existing, [id]: section === 'skills' ? existing[id] === 'none' ? 'proficient' : existing[id] === 'proficient' ? 'expertise' : 'none' : existing[id] === 'none' ? 'proficient' : 'none' }));
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="proficiency-dialog" onCloseAutoFocus={(event) => event.preventDefault()}><DialogTitle>Manage {section === 'skills' ? 'skills' : 'saving throws'}</DialogTitle><DialogDescription>Click a marker to cycle its proficiency. Changes apply only when you save.</DialogDescription><ul>{ids.map((id) => <li key={id}><button type="button" className="proficiency-marker-button" aria-label={`${titleCase(id)}: ${values[id]}. Cycle proficiency`} onClick={() => cycle(id)}><ProficiencyMarker value={values[id] as 'none' | 'proficient' | 'expertise'} /></button><span>{titleCase(id)}</span><em>{values[id] === 'none' ? 'None' : titleCase(values[id])}</em></li>)}</ul><footer><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" onClick={() => { onSave(values); onClose(); }}>Save changes</Button></footer></DialogContent></Dialog>;
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
  const [editingProficiencySection, setEditingProficiencySection] = useState<ProficiencySection | null>(null);
  const [detailSpellId, setDetailSpellId] = useState<string>();
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
  const detailSpell = detailSpellId ? content.spells.find((spell) => spell.id === detailSpellId) : undefined;

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

  const changeSkillOverride = (skill: Skill, value: SkillProficiency | undefined, reason?: string) => setDraftCharacter((current) => {
    const skills = { ...(current.proficiencyOverrides?.skills ?? {}) };
    if (value === undefined) delete skills[skill]; else skills[skill] = { value, reason };
    return { ...current, proficiencyOverrides: { skills, savingThrows: current.proficiencyOverrides?.savingThrows ?? {} } };
  });
  const changeSavingThrowOverride = (ability: Ability, value: 'none' | 'proficient' | undefined, reason?: string) => setDraftCharacter((current) => {
    const savingThrows = { ...(current.proficiencyOverrides?.savingThrows ?? {}) };
    if (value === undefined) delete savingThrows[ability]; else savingThrows[ability] = { value, reason };
    return { ...current, proficiencyOverrides: { skills: current.proficiencyOverrides?.skills ?? {}, savingThrows } };
  });
  const changeCurrency = (denomination: keyof typeof EMPTY_CURRENCY_PURSE, value: number) => setDraftCharacter((current) => ({
    ...current,
    currency: { ...EMPTY_CURRENCY_PURSE, gp: current.currency?.gp ?? current.currencyGp, ...current.currency, [denomination]: Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0) },
  }));
  const saveProficiencySection = (section: ProficiencySection, values: Record<string, string>) => setDraftCharacter((current) => {
    const sourceSkills = current.proficiencies.skills;
    const sourceSaves = new Set(current.proficiencies.savingThrowAbilities);
    if (section === 'skills') {
      const skills = Object.fromEntries(SKILLS.flatMap((skill) => values[skill] === (sourceSkills[skill] ?? 'none') ? [] : [[skill, { value: values[skill] as SkillProficiency }]]));
      return { ...current, proficiencyOverrides: { skills, savingThrows: current.proficiencyOverrides?.savingThrows ?? {} } };
    }
    const savingThrows = Object.fromEntries(ABILITIES.flatMap((ability) => values[ability] === (sourceSaves.has(ability) ? 'proficient' : 'none') ? [] : [[ability, { value: values[ability] as 'none' | 'proficient' }]]));
    return { ...current, proficiencyOverrides: { skills: current.proficiencyOverrides?.skills ?? {}, savingThrows } };
  });

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

  const setSpellPrepared = (classEntryId: string, spellId: string, prepared: boolean) => {
    setDraftCharacter((current) => ({
      ...current,
      preparedSpells: (() => {
        if (content.classes.find((entry) => entry.id === current.classes.find((entry) => entry.id === classEntryId)?.classId)?.spellcasting?.selectionMode === 'level-up-list') return current.preparedSpells;
        return prepared
          ? current.preparedSpells.some((entry) => entry.classEntryId === classEntryId && entry.spellId === spellId) ? current.preparedSpells : [...current.preparedSpells, { classEntryId, spellId }]
          : current.preparedSpells.filter((entry) => entry.classEntryId !== classEntryId || entry.spellId !== spellId);
      })(),
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
        <div><p className="eyebrow">{character.ruleset.replace('e-', 'th edition ')}</p><h1>{character.name}</h1>{onAdvancementCommit && <LevelUpDialog character={draftCharacter} playState={sessionState} content={content} onCommit={async (nextCharacter, nextPlayState) => { await onAdvancementCommit(nextCharacter, nextPlayState); setDraftCharacter(nextCharacter); setSessionState(nextPlayState); }} />}</div>
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

      <TabsContent value="sheet" className="sheet-grid">
        <div className="sheet-column">
          <Section title="Abilities" headerAction={<AbilityScoreDialog scores={draftCharacter.abilityScores} generation={draftCharacter.abilityScoreGeneration} onSave={(abilityScores, abilityScoreGeneration) => setDraftCharacter((current) => ({ ...current, abilityScores, abilityScoreGeneration }))} />}><dl className="ability-grid">{sheet.abilities.map(({ ability, score, modifier }) => <div key={ability}><dt aria-label={titleCase(ability)}><abbr title={titleCase(ability)}>{abilityAbbreviation(ability)}</abbr></dt><dd>{score}<small>{signed(modifier)}</small></dd></div>)}</dl></Section>
          <Section title="Saving throws" headerAction={<OverrideButton label="saving throws" active={false} onClick={() => setEditingProficiencySection('savingThrows')} />}><ul className="check-list">{sheet.savingThrows.map(({ ability, value, proficient }) => <li key={ability}><ProficiencyMarker value={proficient ? 'proficient' : 'none'} label={`${titleCase(ability)} saving throw${proficient ? ', proficient' : ''}`} /><b>{signed(value)}</b><span className="proficiency-name">{titleCase(ability)}</span>{draftCharacter.proficiencyOverrides?.savingThrows[ability] && <span className="proficiency-labels"><em>O</em></span>}</li>)}</ul></Section>
          <Section title="Skills" headerAction={<OverrideButton label="skills" active={false} onClick={() => setEditingProficiencySection('skills')} />}><ul className="check-list skill-list">{sheet.skills.map(({ skill, value, proficiency }) => <li key={skill}><ProficiencyMarker value={proficiency as 'none' | 'proficient' | 'expertise'} label={`${titleCase(skill)}: ${proficiency}`} /><b>{signed(value)}</b><span className="proficiency-name">{titleCase(skill)}</span>{(proficiency === 'expertise' || draftCharacter.proficiencyOverrides?.skills[skill]) && <span className="proficiency-labels">{proficiency === 'expertise' && <em>E</em>}{draftCharacter.proficiencyOverrides?.skills[skill] && <em>O</em>}</span>}</li>)}</ul></Section>
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

      {sheet.spellcasting.length > 0 && <TabsContent value="spells" className="spells-tab"><SpellTab
        sheet={sheet}
        playState={sessionState}
        onPreparedChange={setSpellPrepared}
        onSpellSlotChange={(level, used, maximum) => setSessionState((current) => setSpellSlotUses(current, level, used, maximum))}
        onShowDetails={setDetailSpellId}
      /></TabsContent>}

      <Dialog open={Boolean(detailSpell)} onOpenChange={(nextOpen) => { if (!nextOpen) setDetailSpellId(undefined); }}><DialogContent className="spell-detail-dialog"><DialogTitle>{detailSpell?.name}</DialogTitle><DialogDescription>Level {detailSpell?.level} spell{detailSpell?.castingTime ? ` Â· ${detailSpell.castingTime}` : ''}{detailSpell?.range ? ` Â· ${detailSpell.range}` : ''}</DialogDescription>{detailSpell?.description ? <p>{detailSpell.description}</p> : <p>No description is available for this spell.</p>}{detailSpell?.higherLevelDescription && <section><h3>At higher levels</h3><p>{detailSpell.higherLevelDescription}</p></section>}</DialogContent></Dialog>
      <TabsContent value="inventory" className="tab-panel"><Section title="Inventory"><div className="currency-purse" role="group" aria-label="Currency"><h3>Currency</h3>{(Object.keys(EMPTY_CURRENCY_PURSE) as Array<keyof typeof EMPTY_CURRENCY_PURSE>).map((denomination) => <label key={denomination}>{denomination.toUpperCase()}<input type="number" min="0" step="1" aria-label={`${denomination.toUpperCase()} currency`} value={draftCharacter.currency?.[denomination] ?? (denomination === 'gp' ? draftCharacter.currencyGp : 0)} onChange={(event) => changeCurrency(denomination, event.currentTarget.valueAsNumber)} /></label>)}</div><ul className="inventory-list">{character.inventory.map((entry) => <li key={entry.itemId}><strong>{inventoryLabel(entry.itemId, details.inventory)}</strong><span>Quantity {entry.quantity}</span></li>)}</ul></Section></TabsContent>

      <TabsContent value="character" className="tab-panel character-panel">
        <Section title="Appearance"><div className="appearance-summary"><div className="portrait-placeholder" aria-label={`Portrait placeholder for ${character.name}`}>{character.name.split(' ').map((name) => name[0]).join('')}</div><div><p><strong>Pronouns:</strong> {details.appearance.pronouns}</p><p>{details.appearance.description}</p></div></div></Section>
        <Section title="Backstory"><p className="backstory">{details.backstory}</p></Section>
        <Section title="Notes"><div className="notes-list">{details.notes.map((note) => <article key={note.title}><h3>{note.title}</h3><p>{note.content}</p></article>)}</div></Section>
      </TabsContent>
      </Tabs>
      {pendingRest && <Dialog open onOpenChange={(open) => { if (!open) setPendingRest(null); }}><DialogContent className="rest-dialog"><DialogTitle>Confirm {pendingRest} rest</DialogTitle><DialogDescription>Has the DM confirmed this {pendingRest} rest?</DialogDescription>{pendingRest === 'short' ? <div className="hit-dice-rest-controls"><p>Spend Hit Point Dice after the rest. Record healing manually after rolling.</p>{hitDiceGroups.map((group) => { const used = pendingHitDice[group.classEntryId] ?? group.used; return <div key={group.classEntryId}><span>{group.className} d{group.die}: {used} / {group.maximum} used</span><Button type="button" disabled={used === group.maximum} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: Math.min(group.maximum, (current[group.classEntryId] ?? group.used) + 1) }))}>Spend d{group.die}</Button><Button type="button" variant="secondary" disabled={used === 0} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: Math.max(0, (current[group.classEntryId] ?? group.used) - 1) }))}>Undo</Button></div>; })}</div> : hitDiceRecovery === '2014-half' ? <div className="hit-dice-rest-controls"><p>2014 table rule: restore up to {hitDiceRecoveryLimitValue} spent Hit Point Dice. Choose the groups to restore.</p>{hitDiceGroups.map((group) => { const restored = pendingHitDice[group.classEntryId] ?? 0; const alreadyAllocated = Object.values(pendingHitDice).reduce((total, value) => total + value, 0); return <div key={group.classEntryId}><span>{group.className} d{group.die}: {group.used} used, {restored} restoring</span><Button type="button" disabled={restored >= group.used || alreadyAllocated >= hitDiceRecoveryLimitValue} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: (current[group.classEntryId] ?? 0) + 1 }))}>Restore one</Button><Button type="button" variant="secondary" disabled={restored === 0} onClick={() => setPendingHitDice((current) => ({ ...current, [group.classEntryId]: Math.max(0, (current[group.classEntryId] ?? 0) - 1) }))}>Undo</Button></div>; })}</div> : <p>2024 rules: this Long Rest restores all spent Hit Point Dice.</p>}<div><Button type="button" variant="secondary" onClick={() => setPendingRest(null)}>Cancel</Button><Button type="button" onClick={confirmRest}>DM confirmed {pendingRest} rest</Button></div></DialogContent></Dialog>}
      {editingOverride && <OverrideDialog target={editingOverride} label={overrideDetails[editingOverride].label} calculatedValue={overrideDetails[editingOverride].calculatedValue} override={draftCharacter.manualOverrides[editingOverride]} onSave={changeOverride} onReset={(target) => changeOverride(target)} onClose={() => setEditingOverride(null)} />}
      {editingProficiencySection && <ProficiencySectionDialog section={editingProficiencySection} character={draftCharacter} onSave={(values) => saveProficiencySection(editingProficiencySection, values)} onClose={() => setEditingProficiencySection(null)} />}
    </main>
  );
}
