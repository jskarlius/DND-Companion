import { useState, type ReactNode } from 'react';
import type { CharacterPlayState } from '../../domain/character/types';
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

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const id = `section-${title.toLowerCase().replaceAll(' ', '-')}`;
  return <section className="sheet-section" aria-labelledby={id}><h2 id={id}>{title}</h2>{children}</section>;
}

export function CharacterSheet({ character, playState, content, details }: CharacterSheetProps) {
  const sheet = buildCharacterSheetViewModel(character, playState, content, details);
  const { combat } = details;
  const [activeTab, setActiveTab] = useState<'sheet' | 'character' | 'inventory'>('sheet');

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
        <div><span>Armor Class</span><strong>{combat.armorClass}</strong></div>
        <div><span>Speed</span><strong>{combat.speed} ft.</strong></div>
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
          <Section title="Hit points"><div className="hit-points"><div><span>Current</span><strong>{playState.currentHp}</strong></div><div><span>Maximum</span><strong>{combat.maximumHp}</strong></div><div><span>Temporary</span><strong>{playState.temporaryHp}</strong></div></div></Section>
          <Section title="Attacks"><div className="table-wrap"><table><thead><tr><th>Name</th><th>Attack</th><th>Damage</th><th>Notes</th></tr></thead><tbody>{details.attacks.map((attack) => <tr key={attack.name}><td>{attack.name}</td><td>{signed(attack.attackBonus)}</td><td>{attack.damage}</td><td>{attack.notes ?? '-'}</td></tr>)}</tbody></table></div></Section>
          <Section title="Cantrips"><ul className="card-list">{sheet.cantrips.map((spell) => <li key={spell.id}><strong>{spell.name}</strong><span>{spell.scalingBasis ? `Scales by ${spell.scalingBasis.replace('-', ' ')}` : 'No scaling recorded'}</span></li>)}</ul></Section>
          <Section title="Spells"><ul className="card-list">{sheet.spells.map(({ spell, prepared }) => <li key={spell.id}><strong>{spell.name}</strong><span>Level {spell.level} / {prepared ? 'Prepared' : 'Known'}</span></li>)}</ul></Section>
        </div>

        <div className="sheet-column">
          <Section title="Features"><ul className="card-list">{sheet.features.map((feature) => <li key={feature.id}><strong>{feature.name}</strong><span>{titleCase(feature.automation)} automation</span></li>)}</ul></Section>
          <Section title="Resources"><ul className="card-list">{sheet.resources.map(({ resource, used }) => <li key={resource.id}><strong>{resource.name}</strong><span>{resource.maximum - used} / {resource.maximum} remaining / {titleCase(resource.recharge)}</span></li>)}</ul></Section>
        </div>
      </div>}

      {activeTab === 'inventory' && <div className="tab-panel" role="tabpanel" id="inventory-panel" aria-labelledby="inventory-tab"><Section title="Inventory"><ul className="inventory-list">{character.inventory.map((entry) => <li key={entry.itemId}><strong>{details.inventory[entry.itemId] ?? entry.itemId}</strong><span>Quantity {entry.quantity}</span></li>)}</ul></Section></div>}

      {activeTab === 'character' && <div className="tab-panel character-panel" role="tabpanel" id="character-panel" aria-labelledby="character-tab">
        <Section title="Appearance"><div className="appearance-summary"><div className="portrait-placeholder" aria-label="Portrait placeholder for Ariel Thorne">{character.name.split(' ').map((name) => name[0]).join('')}</div><div><p><strong>Pronouns:</strong> {details.appearance.pronouns}</p><p>{details.appearance.description}</p></div></div></Section>
        <Section title="Backstory"><p className="backstory">{details.backstory}</p></Section>
        <Section title="Notes"><div className="notes-list">{details.notes.map((note) => <article key={note.title}><h3>{note.title}</h3><p>{note.content}</p></article>)}</div></Section>
      </div>}
    </main>
  );
}
