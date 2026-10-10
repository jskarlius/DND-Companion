import { useMemo, useState } from 'react';
import { planAdvancement, type AdvancementPreview } from '../../domain/character/advancement';
import type { Character, CharacterPlayState } from '../../domain/character/types';
import { BundledContentRepository } from '../../domain/content/repository';
import type { ContentFixture } from '../../domain/content/types';
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

export function LevelUpDialog({ character, playState, content, onCommit }: LevelUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(character.classes[0]?.classId ?? content.classes[0]?.id ?? '');
  const [hitPoints, setHitPoints] = useState('4');
  const [subclassId, setSubclassId] = useState('');
  const [ability, setAbility] = useState('');
  const [cantripIds, setCantripIds] = useState<readonly string[]>([]);
  const [spellIds, setSpellIds] = useState<readonly string[]>([]);
  const [classChoices, setClassChoices] = useState<Readonly<Record<string, string>>>({});
  const [preview, setPreview] = useState<AdvancementPreview>();
  const [issues, setIssues] = useState<readonly string[]>([]);
  const targetClass = content.classes.find((entry) => entry.id === classId);
  const fixedHitPointGain = targetClass ? Math.floor(targetClass.hitDie / 2) + 1 : 0;
  const existing = character.classes.find((entry) => entry.classId === classId);
  const nextLevel = (existing?.level ?? 0) + 1;
  const needsSubclass = targetClass?.subclassSelectionLevel === nextLevel && !existing?.subclassId;
  const needsAsi = targetClass?.advancement.find((entry) => entry.level === nextLevel)?.grants.some((grant) => grant.type === 'ability-score-improvement') ?? false;
  const subclasses = useMemo(() => content.subclasses.filter((entry) => entry.classId === classId), [classId, content.subclasses]);
  const progression = targetClass?.spellcasting?.progression.find((entry) => entry.level === nextLevel);
  const previousProgression = targetClass?.spellcasting?.progression.find((entry) => entry.level === nextLevel - 1);
  const needsSpellChoices = targetClass?.spellcasting?.selectionMode === 'known-and-prepared';
  const cantripChoiceCount = targetClass?.spellcasting ? Math.max((progression?.cantripsKnown ?? 0) - (previousProgression?.cantripsKnown ?? 0), 0) : 0;
  const spellChoiceCount = targetClass?.spellcasting?.selectionMode === 'known-and-prepared'
    ? progression?.spellsLearned ?? 0
    : targetClass?.spellcasting ? progression?.preparedSpells ?? 0 : 0;
  const maximumSpellLevel = Math.max(0, ...Object.keys(progression?.slots ?? {}).map(Number));
  const availableSpells = targetClass
    ? targetClass.spellListIds.map((id) => content.spells.find((spell) => spell.id === id)).filter((spell): spell is NonNullable<typeof spell> => Boolean(spell))
    : [];
  const choiceEntryId = existing?.id ?? classEntryId(character, classId);
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
      hitPointGain: { method: 'fixed', hitPoints: Number(hitPoints) },
      classChoices,
      spellSelections: [...cantripIds, ...spellIds].filter(Boolean).map((spellId) => ({ classEntryId: choiceEntryId, spellId, acquiredAtClassLevel: nextLevel, prepared: targetClass?.spellcasting?.selectionMode === 'prepared-from-list' && content.spells.find((spell) => spell.id === spellId)?.level !== 0 })),
    });
    if (!result.ok) { setPreview(undefined); setIssues(result.issues.map((issue) => issue.message)); return; }
    setIssues([]); setPreview(result.preview);
  };

  return <>
    <Button type="button" onClick={() => { setHitPoints(String(fixedHitPointGain)); setPreview(undefined); setIssues([]); setOpen(true); }}>Level up</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="level-up-dialog"><DialogTitle>Plan level-up</DialogTitle><DialogDescription>Nothing changes until you review and confirm the preview.</DialogDescription>
      <label className="level-up-field"><span>Class</span><select aria-label="Class to advance" value={classId} onChange={(event) => { const nextClass = content.classes.find((entry) => entry.id === event.currentTarget.value); setClassId(event.currentTarget.value); setHitPoints(String(nextClass ? Math.floor(nextClass.hitDie / 2) + 1 : 0)); setSubclassId(''); setCantripIds([]); setSpellIds([]); setClassChoices({}); setPreview(undefined); }}>
        {content.classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{character.classes.some((current) => current.classId === entry.id) ? ' (advance)' : ' (new class)'}</option>)}
      </select></label>
      <p>{existing ? `Advance ${targetClass?.name} from level ${existing.level} to ${nextLevel}.` : `Take Cleric/Fighter multiclass level 1 if the ability prerequisite is met.`}</p>
      <label className="level-up-field"><span>Hit Die result (d{targetClass?.hitDie ?? '?'})</span><input aria-label="Hit points gained" type="number" min="1" max={targetClass?.hitDie} value={hitPoints} onChange={(event) => { setHitPoints(event.currentTarget.value); setPreview(undefined); }} /></label>
      <p>Enter the rolled result or the displayed fixed average. Constitution and other maximum-HP effects are calculated separately.</p>
      {cantripChoiceCount > 0 && <fieldset className="level-up-spell-choices"><legend>New cantrips</legend>{Array.from({ length: cantripChoiceCount }, (_, index) => <label className="level-up-field" key={`cantrip-${index}`}><span>Cantrip {index + 1}</span><select aria-label={`New cantrip ${index + 1}`} value={cantripIds[index] ?? ''} onChange={(event) => updateChoice(setCantripIds, cantripIds, index, event.currentTarget.value)}><option value="">Choose a cantrip</option>{availableSpells.filter((spell) => spell.level === 0 && !recordedSpellIds.has(spell.id) && (!cantripIds.includes(spell.id) || cantripIds[index] === spell.id)).sort((left, right) => left.name.localeCompare(right.name)).map((spell) => <option key={spell.id} value={spell.id}>{spell.name}</option>)}</select></label>)}</fieldset>}
      {spellChoiceCount > 0 && <fieldset className="level-up-spell-choices"><legend>{targetClass?.spellcasting?.selectionMode === 'prepared-from-list' ? 'Prepared spells' : 'New spells'}</legend>{Array.from({ length: spellChoiceCount }, (_, index) => <label className="level-up-field" key={`spell-${index}`}><span>Spell {index + 1}</span><select aria-label={`New spell ${index + 1}`} value={spellIds[index] ?? ''} onChange={(event) => updateChoice(setSpellIds, spellIds, index, event.currentTarget.value)}><option value="">Choose a spell</option>{availableSpells.filter((spell) => spell.level > 0 && spell.level <= maximumSpellLevel && !recordedSpellIds.has(spell.id) && (!spellIds.includes(spell.id) || spellIds[index] === spell.id)).sort((left, right) => left.level - right.level || left.name.localeCompare(right.name)).map((spell) => <option key={spell.id} value={spell.id}>Level {spell.level}: {spell.name}</option>)}</select></label>)}</fieldset>}
      {needsSubclass && <label className="level-up-field"><span>Subclass</span><select aria-label="Subclass" value={subclassId} onChange={(event) => { setSubclassId(event.currentTarget.value); setPreview(undefined); }}><option value="">Choose a subclass</option>{subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}
      {requiredChoices.map((choice) => <label className="level-up-field" key={choice.id}><span>{choice.name}</span><select aria-label={choice.name} value={classChoices[choice.id] ?? ''} onChange={(event) => { setClassChoices((current) => ({ ...current, [choice.id]: event.currentTarget.value })); setPreview(undefined); }}><option value="">Choose {choice.name}</option>{choice.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}
      {needsAsi && <label className="level-up-field"><span>Ability Score Improvement</span><select aria-label="Ability score improvement" value={ability} onChange={(event) => { setAbility(event.currentTarget.value); setPreview(undefined); }}><option value="">Choose an ability</option>{Object.keys(character.abilityScores).map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>}
      {issues.length > 0 && <ul role="alert">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
      {preview && <section aria-label="Level-up preview"><h3>Preview</h3><p>Character level {preview.totalLevelBefore} → {preview.totalLevelAfter}; proficiency +{preview.proficiencyBefore} → +{preview.proficiencyAfter}.</p><ul>{preview.changes.map((change) => <li key={`${change.label}:${change.detail}`}><strong>{change.label}:</strong> {change.detail}</li>)}</ul></section>}
      <footer><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>{preview ? <Button type="button" onClick={() => { void Promise.resolve(onCommit(preview.character, preview.playState)).then(() => setOpen(false)); }}>Confirm level-up</Button> : <Button type="button" onClick={makePreview}>Review level-up</Button>}</footer>
    </DialogContent></Dialog>
  </>;
}
