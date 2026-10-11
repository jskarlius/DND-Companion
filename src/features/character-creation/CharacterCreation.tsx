import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import { SpellChoicePicker } from '../../components/SpellChoicePicker';
import { bundledContentRepository } from '../../domain/content/bundledContent';
import { planCharacterCreation, type CharacterCreationRequest, type CreationIssue } from '../../domain/character/creation';
import { ABILITIES, SKILLS, type Ability, type AbilityScores, type Skill } from '../../domain/character/types';
import { CharacterRepository } from '../../storage/characterRepository';
import './CharacterCreation.css';

const repository = new CharacterRepository();
const wizard = bundledContentRepository.getClass('srd-2024:class:wizard')!;
const levelOneSpells = wizard.spellListIds.filter((id) => bundledContentRepository.getSpell(id)?.level === 1);
const cantrips = wizard.spellListIds.filter((id) => bundledContentRepository.getSpell(id)?.level === 0);
const profile = wizard.levelOne!;

function nameFor(id: string): string { return bundledContentRepository.getSpell(id)?.name ?? id; }
function skillName(skill: Skill): string { return skill.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()); }
function toggle(ids: readonly string[], id: string): string[] { return ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]; }
function createId(): string { return `local:character:${crypto.randomUUID()}`; }
function equipmentSummary(packageId: string): string {
  const selected = wizard.startingEquipmentPackages?.find((entry) => entry.id === packageId);
  if (!selected) return '';
  const items = selected.entries.map((entry) => entry.type === 'item' ? `${entry.quantity > 1 ? `${entry.quantity} × ` : ''}${bundledContentRepository.getItem(entry.itemId)?.name ?? entry.itemId}` : 'a chosen item');
  return [...items, selected.currencyGp ? `${selected.currencyGp} gp` : 'no starting coin'].join(', ');
}

export function CharacterCreation() {
  const navigate = useNavigate();
  const id = useMemo(createId, []);
  const classEntryId = `${id}:class-entry:wizard`;
  const [name, setName] = useState('');
  const [abilityScores, setAbilityScores] = useState<AbilityScores>({ strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 });
  const [skills, setSkills] = useState<Skill[]>(['arcana', 'history']);
  const [equipmentPackageId, setEquipmentPackageId] = useState('a');
  const [cantripIds, setCantripIds] = useState<string[]>(cantrips.slice(0, 3));
  const [spellbookSpellIds, setSpellbookSpellIds] = useState<string[]>(levelOneSpells.slice(0, 6));
  const [preparedSpellIds, setPreparedSpellIds] = useState<string[]>(levelOneSpells.slice(0, 4));
  const [detailSpellId, setDetailSpellId] = useState<string>();
  const [stage, setStage] = useState<'class' | 'details'>('class');
  const [reviewing, setReviewing] = useState(false);
  const [issues, setIssues] = useState<readonly CreationIssue[]>([]);
  const [saving, setSaving] = useState(false);

  const request = (): CharacterCreationRequest => ({ characterId: id, classEntryId, name, enabledContentPackIds: ['srd-2024'], abilityScoreGeneration: 'custom', abilityScores, classId: wizard.id, classSkillIds: skills, toolIds: [], classChoices: {}, equipmentPackageId, cantripIds, spellbookSpellIds, selectedSpellIds: [], preparedSpellIds, initialHitPoints: wizard.hitDie, hitPointMethod: 'fixed' });
  const validate = () => {
    const result = planCharacterCreation(request(), bundledContentRepository);
    if (!result.ok) { setIssues(result.issues); setReviewing(false); return undefined; }
    setIssues([]); return result;
  };
  const openReview = () => { if (validate()) setReviewing(true); };
  const save = async () => {
    const result = validate();
    if (!result || !result.ok) return;
    setSaving(true);
    try { await repository.commitCreation(result.character, result.playState); navigate(`/characters/${encodeURIComponent(result.character.id)}`); }
    catch (error) { setIssues([{ field: 'save', message: error instanceof Error ? error.message : 'The character could not be saved.' }]); setReviewing(false); }
    finally { setSaving(false); }
  };
  const updateSpellChoice = (setSelected: (next: string[]) => void, selected: readonly string[], index: number, spellId: string) => {
    setSelected(Array.from({ length: Math.max(selected.length, index + 1) }, (_, choiceIndex) => choiceIndex === index ? spellId : selected[choiceIndex] ?? ''));
  };
  const picker = (label: string, ids: readonly string[], selected: readonly string[], setSelected: (next: string[]) => void, count: number) => <fieldset className="creation-choice"><legend>{label}</legend>{Array.from({ length: count }, (_, index) => <SpellChoicePicker key={`${label}-${index}`} label={`${label} ${index + 1}`} value={selected[index] ?? ''} spells={ids.map((id) => bundledContentRepository.getSpell(id)).filter((spell): spell is NonNullable<typeof spell> => Boolean(spell)).filter((spell) => !selected.includes(spell.id) || selected[index] === spell.id)} onChange={(spellId) => updateSpellChoice(setSelected, selected, index, spellId)} onShowDetails={setDetailSpellId} />)}</fieldset>;
  const detailSpell = detailSpellId ? bundledContentRepository.getSpell(detailSpellId) : undefined;

  return <main className="creation-page">
    <header className="creation-heading"><div><p className="eyebrow">Guided character creation</p><h1>{stage === 'class' ? 'Choose a class' : 'Create a Wizard'}</h1><p>{stage === 'class' ? 'Supported classes appear here as their complete creation workflows are ready.' : 'Choose a level-1 SRD Wizard, then review everything before anything is saved.'}</p></div><Button asChild variant="secondary"><Link to="/">Cancel</Link></Button></header>
    {stage === 'class' ? <Card className="creation-class-picker"><h2>Available now</h2><button type="button" className="creation-class-option" onClick={() => setStage('details')}><strong>Wizard</strong><span>Arcane spellbook caster · levels 1–20 supported</span><small>Wizard is the first completed creation path. Other classes will unlock here as their contracts are implemented.</small></button></Card> : <>
    {issues.length > 0 && <Card className="creation-issues" role="alert"><h2>Check your choices</h2><ul>{issues.map((issue, index) => <li key={`${issue.field}-${index}`}>{issue.message}</li>)}</ul></Card>}
    {!reviewing ? <div className="creation-layout">
      <Card className="creation-card"><h2>Identity and abilities</h2><label className="creation-field">Character name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" /></label><div className="creation-abilities">{ABILITIES.map((ability) => <label key={ability}>{ability}<input type="number" min="1" max="30" value={abilityScores[ability]} onChange={(event) => setAbilityScores({ ...abilityScores, [ability]: Number(event.target.value) })} /></label>)}</div><p className="creation-note">Ability scores use Custom for this first testable route. Standard array and point buy arrive with the broader species/background contract.</p></Card>
      <Card className="creation-card"><h2>Wizard training</h2><fieldset className="creation-choice"><legend>Class skills <span>({skills.length}/2)</span></legend><div className="creation-check-grid">{profile.skillChoices.options.map((skill) => <label key={skill}><input type="checkbox" checked={skills.includes(skill)} disabled={!skills.includes(skill) && skills.length >= 2} onChange={() => setSkills(toggle(skills, skill) as Skill[])} /> {skillName(skill)}</label>)}</div></fieldset><fieldset className="creation-choice"><legend>Starting equipment</legend>{wizard.startingEquipmentPackages!.map((choice) => <label className="creation-equipment-option" key={choice.id}><input type="radio" name="equipment" checked={equipmentPackageId === choice.id} onChange={() => setEquipmentPackageId(choice.id)} /><span><strong>Option {choice.id.toUpperCase()}</strong>{equipmentSummary(choice.id)}</span></label>)}</fieldset></Card>
      <Card className="creation-card creation-spells"><h2>Spellbook and daily preparation</h2>{picker('Cantrip', cantrips, cantripIds, setCantripIds, 3)}{picker('Spellbook spell', levelOneSpells, spellbookSpellIds, setSpellbookSpellIds, 6)}{picker('Prepared spell', spellbookSpellIds, preparedSpellIds, setPreparedSpellIds, 4)}</Card>
      <div className="creation-actions"><Button type="button" onClick={openReview}>Review character</Button></div>
    </div> : <Card className="creation-review"><p className="eyebrow">Nothing has been saved</p><h2>Review {name || 'your Wizard'}</h2><dl><div><dt>Class</dt><dd>Wizard 1</dd></div><div><dt>Skills</dt><dd>{skills.map(skillName).join(', ')}</dd></div><div><dt>Hit points</dt><dd>{wizard.hitDie + Math.floor((abilityScores.constitution - 10) / 2)} (including Constitution)</dd></div><div><dt>Cantrips</dt><dd>{cantripIds.map(nameFor).join(', ')}</dd></div><div><dt>Spellbook</dt><dd>{spellbookSpellIds.map(nameFor).join(', ')}</dd></div><div><dt>Prepared today</dt><dd>{preparedSpellIds.map(nameFor).join(', ')}</dd></div></dl><p className="creation-note">Accepting creates exactly one character and fresh play state on this device.</p><div className="creation-actions"><Button type="button" variant="secondary" onClick={() => setReviewing(false)}>Back to edit</Button><Button type="button" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Create Wizard'}</Button></div></Card>}
    </>}
    <Dialog open={Boolean(detailSpell)} onOpenChange={(open) => { if (!open) setDetailSpellId(undefined); }}><DialogContent className="spell-detail-dialog"><DialogTitle>{detailSpell?.name}</DialogTitle><DialogDescription>Level {detailSpell?.level} spell{detailSpell?.castingTime ? ` · ${detailSpell.castingTime}` : ''}{detailSpell?.range ? ` · ${detailSpell.range}` : ''}</DialogDescription>{detailSpell?.description ? <p>{detailSpell.description}</p> : <p>No description is available for this spell.</p>}{detailSpell?.higherLevelDescription && <section><h3>At higher levels</h3><p>{detailSpell.higherLevelDescription}</p></section>}</DialogContent></Dialog>
  </main>;
}
