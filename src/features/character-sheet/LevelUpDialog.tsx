import { useMemo, useState } from 'react';
import { planAdvancement, type AdvancementPreview } from '../../domain/character/advancement';
import type { Character, CharacterPlayState } from '../../domain/character/types';
import { BundledContentRepository } from '../../domain/content/repository';
import type { ContentFixture, Spell } from '../../domain/content/types';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';

interface LevelUpDialogProps {
  readonly character: Character;
  readonly playState: CharacterPlayState;
  readonly content: ContentFixture;
  readonly onCommit: (character: Character, playState: CharacterPlayState) => Promise<void> | void;
}

function classEntryId(character: Character, classId: string): string {
  return `${character.id}:class-entry:${classId.split(':').at(-1)}`;
}

function SpellChoicePicker({ label, value, spells, onChange, onShowDetails }: {
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
  const selectSpell = (spell: Spell) => { onChange(spell.id); setQuery(spell.name); setPreviewId(spell.id); setOpen(false); };

  return <label className="level-up-field spell-choice-picker"><span>{label}</span><input aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={open} value={query} placeholder="Search spells" onFocus={() => setOpen(true)} onChange={(event) => { const nextQuery = event.currentTarget.value; const exactMatch = spells.find((spell) => spell.name.localeCompare(nextQuery, undefined, { sensitivity: 'accent' }) === 0); if (exactMatch) selectSpell(exactMatch); else { setQuery(nextQuery); setOpen(true); setPreviewId(''); } }} onBlur={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false); }} />
    {open && <div className="spell-choice-menu" role="listbox" aria-label={`${label} matches`}><div className="spell-level-tabs" role="tablist" aria-label={`${label} spell levels`}><button type="button" role="tab" aria-selected={levelFilter === 'all'} onMouseDown={(event) => event.preventDefault()} onClick={() => setLevelFilter('all')}>All</button>{spellLevels.map((level) => <button key={level} type="button" role="tab" aria-selected={levelFilter === level} onMouseDown={(event) => event.preventDefault()} onClick={() => setLevelFilter(level)}>{level === 0 ? 'Cantrips' : `Level ${level}`}</button>)}</div><ul>{displayed.map((spell) => <li key={spell.id}><button type="button" role="option" aria-selected={spell.id === value} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setPreviewId(spell.id)} onFocus={() => setPreviewId(spell.id)} onClick={() => selectSpell(spell)}>{spell.name}<small>Level {spell.level}</small></button></li>)}</ul>{filtered.length === 0 && <p>No eligible spells match that search.</p>}{preview && <div className="spell-choice-preview"><strong>{preview.name}</strong><p>{preview.description?.slice(0, 260) || 'No description is available.'}</p><Button type="button" variant="secondary" onMouseDown={(event) => event.preventDefault()} onClick={() => onShowDetails(preview.id)}>View full description</Button></div>}</div>}
  </label>;
}

export function LevelUpDialog({ character, playState, content, onCommit }: LevelUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(character.classes[0]?.classId ?? content.classes[0]?.id ?? '');
  const [hitPoints, setHitPoints] = useState('4');
  const [hitPointMethod, setHitPointMethod] = useState<'fixed' | 'rolled'>('fixed');
  const [subclassId, setSubclassId] = useState('');
  const [ability, setAbility] = useState('');
  const [cantripIds, setCantripIds] = useState<readonly string[]>([]);
  const [spellIds, setSpellIds] = useState<readonly string[]>([]);
  const [detailSpellId, setDetailSpellId] = useState<string>();
  const [classChoices, setClassChoices] = useState<Readonly<Record<string, string>>>({});
  const [preview, setPreview] = useState<AdvancementPreview>();
  const [issues, setIssues] = useState<readonly string[]>([]);
  const targetClass = content.classes.find((entry) => entry.id === classId);
  const fixedHitPointGain = targetClass ? Math.floor(targetClass.hitDie / 2) + 1 : 0;
  const existing = character.classes.find((entry) => entry.classId === classId);
  const choiceEntryId = existing?.id ?? classEntryId(character, classId);
  const nextLevel = (existing?.level ?? 0) + 1;
  const needsSubclass = targetClass?.subclassSelectionLevel === nextLevel && !existing?.subclassId;
  const needsAsi = targetClass?.advancement.find((entry) => entry.level === nextLevel)?.grants.some((grant) => grant.type === 'ability-score-improvement') ?? false;
  const subclasses = useMemo(() => content.subclasses.filter((entry) => entry.classId === classId), [classId, content.subclasses]);
  const progression = targetClass?.spellcasting?.progression.find((entry) => entry.level === nextLevel);
  const previousProgression = targetClass?.spellcasting?.progression.find((entry) => entry.level === nextLevel - 1);
  const learnsSpellList = targetClass?.spellcasting?.selectionMode === 'known-and-prepared' || targetClass?.spellcasting?.selectionMode === 'level-up-list';
  const cantripChoiceCount = targetClass?.spellcasting ? Math.max((progression?.cantripsKnown ?? 0) - (previousProgression?.cantripsKnown ?? 0), 0) : 0;
  const existingPreparedSpells = character.preparedSpells.filter((selection) => selection.classEntryId === choiceEntryId && (content.spells.find((spell) => spell.id === selection.spellId)?.level ?? 0) > 0).length;
  const spellChoiceCount = learnsSpellList
    ? progression?.spellsLearned ?? Math.max((progression?.preparedSpells ?? 0) - (previousProgression?.preparedSpells ?? 0), 0)
    : targetClass?.spellcasting ? Math.max((progression?.preparedSpells ?? 0) - existingPreparedSpells, 0) : 0;
  const maximumSpellLevel = Math.max(0, ...Object.keys(progression?.slots ?? {}).map(Number));
  const availableSpells = targetClass
    ? targetClass.spellListIds.map((id) => content.spells.find((spell) => spell.id === id)).filter((spell): spell is NonNullable<typeof spell> => Boolean(spell))
    : [];
  const detailSpell = detailSpellId ? content.spells.find((spell) => spell.id === detailSpellId) : undefined;
  const selectedSubclass = subclassId ? content.subclasses.find((entry) => entry.id === subclassId) : existing?.subclassId ? content.subclasses.find((entry) => entry.id === existing.subclassId) : undefined;
  const advancementGrants = [...(targetClass?.advancement.find((entry) => entry.level === nextLevel)?.grants ?? []), ...(selectedSubclass?.advancement.find((entry) => entry.level === nextLevel)?.grants ?? [])];
  const requiredChoices = advancementGrants.filter((grant): grant is Extract<(typeof advancementGrants)[number], { type: 'choice' }> => grant.type === 'choice').map((grant) => content.choices.find((choice) => choice.id === grant.choiceId)).filter((choice): choice is NonNullable<typeof choice> => Boolean(choice));
  const recordedSpellIds = new Set(character.spellSelections.filter((selection) => selection.classEntryId === choiceEntryId).map((selection) => selection.spellId));
  const updateChoice = (setChoices: (value: readonly string[]) => void, choices: readonly string[], index: number, value: string) => {
    setChoices(Array.from({ length: Math.max(choices.length, index + 1) }, (_, choiceIndex) => choiceIndex === index ? value : choices[choiceIndex] ?? ''));
    setPreview(undefined);
  };

  const makePreview = () => {
    const result = planAdvancement(character, playState, new BundledContentRepository(content), {
      targetClassId: classId,
      ...(existing ? {} : { newClassEntryId: classEntryId(character, classId) }),
      ...(subclassId ? { subclassId } : {}),
      ...(needsAsi && ability ? { abilityScoreIncreases: { [ability]: 2 } } : {}),
      hitPointGain: { method: hitPointMethod, hitPoints: Number(hitPoints) },
      classChoices,
      spellSelections: [...cantripIds, ...spellIds].filter(Boolean).map((spellId) => ({ classEntryId: choiceEntryId, spellId, acquiredAtClassLevel: nextLevel, prepared: targetClass?.spellcasting?.selectionMode === 'prepared-from-list' && content.spells.find((spell) => spell.id === spellId)?.level !== 0 })),
    });
    if (!result.ok) { setPreview(undefined); setIssues(result.issues.map((issue) => issue.message)); return; }
    setIssues([]); setPreview(result.preview);
  };

  return <>
    <Button type="button" onClick={() => { setHitPoints(String(fixedHitPointGain)); setHitPointMethod('fixed'); setPreview(undefined); setIssues([]); setOpen(true); }}>Level up</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="level-up-dialog"><DialogTitle>Plan level-up</DialogTitle><DialogDescription>Nothing changes until you review and confirm the preview.</DialogDescription>
      <label className="level-up-field"><span>Class</span><select aria-label="Class to advance" value={classId} onChange={(event) => { const nextClass = content.classes.find((entry) => entry.id === event.currentTarget.value); setClassId(event.currentTarget.value); setHitPoints(String(nextClass ? Math.floor(nextClass.hitDie / 2) + 1 : 0)); setHitPointMethod('fixed'); setSubclassId(''); setCantripIds([]); setSpellIds([]); setClassChoices({}); setPreview(undefined); }}>
        {content.classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{character.classes.some((current) => current.classId === entry.id) ? ' (advance)' : ' (new class)'}</option>)}
      </select></label>
      <p>{existing ? `Advance ${targetClass?.name} from level ${existing.level} to ${nextLevel}.` : `Add ${targetClass?.name ?? 'the selected class'} at level 1. Multiclass prerequisites are checked when you review.`}</p>
      <div className="hit-die-control"><label className="level-up-field"><span>Hit Die result (d{targetClass?.hitDie ?? '?'})</span><input aria-label="Hit points gained" type="number" min="1" max={targetClass?.hitDie} value={hitPoints} onChange={(event) => { setHitPoints(event.currentTarget.value); setHitPointMethod('rolled'); setPreview(undefined); }} /></label><Button type="button" variant="secondary" onClick={() => { setHitPoints(String(fixedHitPointGain)); setHitPointMethod('fixed'); setPreview(undefined); }}>Use fixed average (+{fixedHitPointGain})</Button></div>
      <p>Enter a rolled Hit Die result, or restore the fixed average. Constitution and permanent maximum-HP effects are applied separately.</p>
      {cantripChoiceCount > 0 && <fieldset className="level-up-spell-choices"><legend>New cantrips</legend>{Array.from({ length: cantripChoiceCount }, (_, index) => <SpellChoicePicker key={`cantrip-${index}-${classId}`} label={`New cantrip ${index + 1}`} value={cantripIds[index] ?? ''} spells={availableSpells.filter((spell) => spell.level === 0 && !recordedSpellIds.has(spell.id) && (!cantripIds.includes(spell.id) || cantripIds[index] === spell.id)).sort((left, right) => left.name.localeCompare(right.name))} onChange={(value) => updateChoice(setCantripIds, cantripIds, index, value)} onShowDetails={setDetailSpellId} />)}</fieldset>}
      {spellChoiceCount > 0 && <fieldset className="level-up-spell-choices"><legend>{targetClass?.spellcasting?.selectionMode === 'prepared-from-list' ? 'Prepared spells' : 'New spells'}</legend>{Array.from({ length: spellChoiceCount }, (_, index) => <SpellChoicePicker key={`spell-${index}-${classId}`} label={`New spell ${index + 1}`} value={spellIds[index] ?? ''} spells={availableSpells.filter((spell) => spell.level > 0 && spell.level <= maximumSpellLevel && !recordedSpellIds.has(spell.id) && (!spellIds.includes(spell.id) || spellIds[index] === spell.id)).sort((left, right) => left.level - right.level || left.name.localeCompare(right.name))} onChange={(value) => updateChoice(setSpellIds, spellIds, index, value)} onShowDetails={setDetailSpellId} />)}</fieldset>}
      {needsSubclass && <label className="level-up-field"><span>Subclass</span><select aria-label="Subclass" value={subclassId} onChange={(event) => { setSubclassId(event.currentTarget.value); setPreview(undefined); }}><option value="">Choose a subclass</option>{subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}
      {requiredChoices.map((choice) => <label className="level-up-field" key={choice.id}><span>{choice.name}</span><select aria-label={choice.name} value={classChoices[choice.id] ?? ''} onChange={(event) => { const value = event.currentTarget.value; setClassChoices((current) => ({ ...current, [choice.id]: value })); setPreview(undefined); }}><option value="">Choose {choice.name}</option>{choice.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}
      {needsAsi && <label className="level-up-field"><span>Ability Score Improvement</span><select aria-label="Ability score improvement" value={ability} onChange={(event) => { setAbility(event.currentTarget.value); setPreview(undefined); }}><option value="">Choose an ability</option>{Object.keys(character.abilityScores).map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>}
      {issues.length > 0 && <ul role="alert">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
      {preview && <section aria-label="Level-up preview"><h3>Preview</h3><p>Character level {preview.totalLevelBefore} → {preview.totalLevelAfter}; proficiency +{preview.proficiencyBefore} → +{preview.proficiencyAfter}.</p><ul>{preview.changes.map((change) => <li key={`${change.label}:${change.detail}`}><strong>{change.label}:</strong> {change.detail}</li>)}</ul></section>}
      <footer><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>{preview ? <Button type="button" onClick={() => { void Promise.resolve(onCommit(preview.character, preview.playState)).then(() => setOpen(false)); }}>Confirm level-up</Button> : <Button type="button" onClick={makePreview}>Review level-up</Button>}</footer>
    </DialogContent></Dialog>
    <Dialog open={Boolean(detailSpell)} onOpenChange={(nextOpen) => { if (!nextOpen) setDetailSpellId(undefined); }}><DialogContent className="spell-detail-dialog"><DialogTitle>{detailSpell?.name}</DialogTitle><DialogDescription>Level {detailSpell?.level} spell{detailSpell?.castingTime ? ` · ${detailSpell.castingTime}` : ''}{detailSpell?.range ? ` · ${detailSpell.range}` : ''}</DialogDescription>{detailSpell?.description ? <p>{detailSpell.description}</p> : <p>No description is available for this spell.</p>}{detailSpell?.higherLevelDescription && <section><h3>At higher levels</h3><p>{detailSpell.higherLevelDescription}</p></section>}</DialogContent></Dialog>
  </>;
}
