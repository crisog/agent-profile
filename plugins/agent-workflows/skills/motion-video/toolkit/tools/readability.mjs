import { COPY, ROLL } from '../src/timing.js';

const CHARS_PER_SECOND = 15;
const SETTLE_SECONDS = 0.3;
const EASE_OUT_95_FRACTION = 0.45;

function completeAt(entry) {
  if (entry.fade !== undefined) {
    return entry.in + entry.fade;
  }
  const letters = entry.lines.join(' ').length;
  return entry.in + ROLL.enter.stagger * (letters - 1) + ROLL.enter.duration * EASE_OUT_95_FRACTION;
}

function floorSeconds(characters) {
  return characters / CHARS_PER_SECOND + SETTLE_SECONDS;
}

const units = [];
const groups = new Map();
for (const entry of COPY) {
  const unit = { id: entry.id, characters: entry.lines.join(' ').length, complete: completeAt(entry), out: entry.out };
  units.push(unit);
  if (entry.group) {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), unit]);
  }
}
for (const [id, members] of groups) {
  if (members.length > 1) {
    units.push({
      id,
      characters: members.reduce((sum, member) => sum + member.characters, members.length - 1),
      complete: Math.min(...members.map((member) => member.complete)),
      out: Math.max(...members.map((member) => member.out))
    });
  }
}

let isPassing = true;
for (const unit of units.sort((a, b) => a.complete - b.complete)) {
  const still = unit.out - unit.complete;
  const floor = floorSeconds(unit.characters);
  const pass = still >= floor;
  isPassing &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${unit.id.padEnd(9)} ${unit.characters.toString().padStart(3)} chars  still ${still.toFixed(2)} s  floor ${floor.toFixed(2)} s  margin ${(still - floor).toFixed(2)} s`);
}
console.log(isPassing ? 'READABILITY pass' : 'READABILITY fail');
process.exitCode = isPassing ? 0 : 1;
