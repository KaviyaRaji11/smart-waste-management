/**
 * Smart Priority Engine — scores every report from 0 to 100.
 *
 * Four weighted factors (weights add up to 100):
 *   Fill level          40 pts  how full the bin is (0–100 %)
 *   Report age          25 pts  hours waiting, reaching the maximum at 48 h
 *   Duplicate reports   20 pts  other open reports for the same bin (max at 4)
 *   Area sensitivity    15 pts  hospitals, schools, markets, bus stands, ...
 *
 * Levels:  score >= 55 -> High,  score >= 30 -> Medium,  otherwise Low
 */

const WEIGHTS = { fill: 40, age: 25, duplicates: 20, area: 15 };
const MAX_AGE_HOURS = 48;
const MAX_DUPLICATES = 4;
const HIGH_AT = 55;
const MEDIUM_AT = 30;

// Area sensitivity: the highest matching rule wins (weight 0–1).
const AREA_RULES = [
  { weight: 1, words: ["hospital", "clinic", "medical", "school", "college", "university", "nursery"] },
  { weight: 0.8, words: ["market", "bazaar", "bus stand", "bus stop", "bus terminus", "railway", "station", "metro", "temple", "church", "mosque", "mall", "theatre", "stadium"] },
  { weight: 0.5, words: ["main road", "highway", "junction", "signal", "park", "office", "complex", "canteen", "restaurant", "hotel"] },
];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round1 = (n) => Math.round(n * 10) / 10;

// 0–1 sensitivity based on the words found in the address / landmark / description
function areaSensitivity(text = "") {
  const haystack = ` ${String(text).toLowerCase()} `;
  let best = 0;
  for (const rule of AREA_RULES) {
    if (rule.weight > best && rule.words.some((w) => haystack.includes(w))) best = rule.weight;
  }
  return best;
}

// Old reports only stored a 1–3 severity, so translate it to a fill level
function fillFromSeverity(severity) {
  return { 1: 50, 2: 75, 3: 95 }[Number(severity)] || 75;
}

// The 1–3 severity is kept in sync for older screens and reports
function severityFromFill(fillLevel) {
  const f = Number(fillLevel);
  if (f >= 85) return 3;
  if (f >= 60) return 2;
  return 1;
}

function levelFromScore(score) {
  if (score >= HIGH_AT) return "High";
  if (score >= MEDIUM_AT) return "Medium";
  return "Low";
}

function calculatePriority({ fillLevel, createdAt, duplicateCount = 0, text = "", now = Date.now() }) {
  const fill = clamp(Number(fillLevel) || 0, 0, 100) / 100;

  const ageMs = Math.max(0, now - new Date(createdAt).getTime());
  const age = clamp(ageMs / (1000 * 60 * 60), 0, MAX_AGE_HOURS) / MAX_AGE_HOURS;

  const dup = clamp(Number(duplicateCount) || 0, 0, MAX_DUPLICATES) / MAX_DUPLICATES;
  const area = areaSensitivity(text);

  const breakdown = {
    fill: round1(fill * WEIGHTS.fill),
    age: round1(age * WEIGHTS.age),
    duplicates: round1(dup * WEIGHTS.duplicates),
    area: round1(area * WEIGHTS.area),
  };

  const score = clamp(round1(breakdown.fill + breakdown.age + breakdown.duplicates + breakdown.area), 0, 100);
  return { score, level: levelFromScore(score), breakdown };
}

module.exports = {
  calculatePriority,
  areaSensitivity,
  fillFromSeverity,
  severityFromFill,
  levelFromScore,
  WEIGHTS,
};
