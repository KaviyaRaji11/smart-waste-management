import React from "react";
/* ---------- helpers ---------- */
const STARS = Array.from({ length: 70 }, (_, i) => {
  const a = (i * 9301 + 49297) % 233280;
  const b = (i * 7919 + 12345) % 233280;
  return { x: (a / 233280) * 100, y: (b / 233280) * 62, r: 0.6 + ((i * 37) % 10) / 9, o: 0.35 + ((i * 53) % 10) / 16 };
});

function Pine({ x, base, h, color }) {
  const w = h * 0.46;
  const tiers = 5;
  const parts = [];
  for (let t = 0; t < tiers; t++) {
    const top = base - h + (h * 0.78 * t) / tiers;
    const bottom = base - h * 0.12 - (h * 0.66 * (tiers - 1 - t)) / tiers + h * 0.1;
    const half = (w / 2) * (0.38 + (0.62 * (t + 1)) / tiers);
    parts.push(`${x},${top} ${x + half},${bottom} ${x - half},${bottom}`);
  }
  return (
    <g fill={color}>
      {parts.map((p, i) => <polygon key={i} points={p} />)}
      <rect x={x - h * 0.025} y={base - h * 0.14} width={h * 0.05} height={h * 0.14} />
    </g>
  );
}

/* ---------- Login background: night sky, mountains, pine forest ---------- */
export function NightForest() {
  const back = [40, 150, 270, 400, 520, 640, 770, 900, 1030, 1150, 1280, 1410, 1540];
  const mid = [-20, 110, 230, 360, 500, 610, 740, 870, 990, 1120, 1250, 1380, 1500, 1620];
  const front = [20, 190, 330, 1290, 1430, 1580];
  return (
    <svg className="au-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06281d" />
          <stop offset="0.55" stopColor="#146041" />
          <stop offset="0.8" stopColor="#3f9a73" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      {STARS.map((s, i) => <circle key={i} cx={(s.x / 100) * 1600} cy={(s.y / 100) * 900} r={s.r} fill="#fff" opacity={s.o} />)}
      <path d="M0 560 L90 470 L160 540 L260 450 L360 560 L470 500 L560 590 L1040 590 L1140 500 L1230 560 L1330 440 L1430 530 L1520 470 L1600 540 V900 H0Z" fill="#2d8a64" opacity="0.85" />
      {back.map((x, i) => <Pine key={"b" + i} x={x} base={720} h={170 + (i % 3) * 35} color="#1f7352" />)}
      <rect y="715" width="1600" height="200" fill="#1f7352" />
      {mid.map((x, i) => <Pine key={"m" + i} x={x} base={800} h={230 + (i % 4) * 40} color="#145239" />)}
      <rect y="795" width="1600" height="120" fill="#145239" />
      {front.map((x, i) => <Pine key={"f" + i} x={x} base={920} h={420 + (i % 3) * 70} color="#082e20" />)}
    </svg>
  );
}

/* ---------- Register panel: city + recycling bin + report pins ---------- */
const BUILDINGS = [
  [10, 46, 150], [62, 34, 110], [102, 52, 190], [160, 40, 130], [206, 56, 170], [268, 38, 100],
  [312, 50, 160], [368, 36, 120], [410, 54, 200], [470, 40, 140],
];

function Pin({ x, y, c = "#fb7185", s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-10 -14 -17 -22 -17 -31 A17 17 0 1 1 17 -31 C17 -22 10 -14 0 0Z" fill={c} />
      <circle cy="-31" r="6.5" fill="#fff" />
    </g>
  );
}

export function WasteArt() {
  return (
    <svg className="rg-art-svg" viewBox="0 0 520 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="wa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d4a34" />
          <stop offset="0.5" stopColor="#1f7a55" />
          <stop offset="1" stopColor="#06281d" />
        </linearGradient>
        <radialGradient id="wa-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a7f3d0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#a7f3d0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wa-bin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5fd89a" />
          <stop offset="0.5" stopColor="#8ef0b9" />
          <stop offset="1" stopColor="#3fbf80" />
        </linearGradient>
      </defs>
      <rect width="520" height="700" fill="url(#wa-sky)" />
      {STARS.slice(0, 45).map((s, i) => <circle key={i} cx={(s.x / 100) * 520} cy={(s.y / 100) * 380} r={s.r * 0.9} fill="#fff" opacity={s.o} />)}
      <circle cx="390" cy="170" r="110" fill="url(#wa-glow)" />
      <circle cx="390" cy="170" r="34" fill="#ecfdf5" opacity="0.92" />
      <rect y="620" width="520" height="80" fill="#04170f" />
      <g transform="translate(0 -48)">
      {/* skyline */}
      <g transform="translate(0 330)">
        {BUILDINGS.map(([x, w, h], i) => (
          <g key={i}>
            <rect x={x} y={250 - h} width={w} height={h} fill={i % 2 ? "#0f4030" : "#14513c"} />
            {Array.from({ length: Math.floor(h / 28) }).map((_, r) =>
              [0, 1].map((c) => ((r * 3 + c * 5 + i) % 4 !== 0) && <rect key={r + "-" + c} x={x + 9 + c * (w / 2 - 4)} y={250 - h + 12 + r * 28} width="7" height="10" rx="1.5" fill="#fde68a" opacity="0.55" />)
            )}
          </g>
        ))}
      </g>
      {/* ground */}
      <path d="M0 585 Q130 560 260 575 T520 565 V700 H0Z" fill="#082417" />
      <path d="M0 640 Q140 615 270 632 T520 622 V700 H0Z" fill="#04170f" />
      {/* route between pins */}
      <path d="M95 300 C 160 240, 230 330, 300 270 S 400 215, 430 250" fill="none" stroke="#fcd34d" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" opacity="0.9" />
      <Pin x={95} y={305} c="#fb7185" />
      <Pin x={300} y={278} c="#fbbf24" s={0.85} />
      <Pin x={432} y={258} c="#5eead4" s={0.8} />
      {/* leaves */}
      <ellipse cx="160" cy="552" rx="9" ry="26" fill="#34d399" transform="rotate(-28 160 552)" />
      <ellipse cx="148" cy="556" rx="8" ry="22" fill="#10b981" transform="rotate(-55 148 556)" />
      <ellipse cx="366" cy="552" rx="9" ry="26" fill="#34d399" transform="rotate(28 366 552)" />
      <ellipse cx="378" cy="556" rx="8" ry="22" fill="#10b981" transform="rotate(55 378 556)" />
      {/* bin */}
      <ellipse cx="262" cy="582" rx="95" ry="12" fill="#000" opacity="0.35" />
      <circle cx="205" cy="574" r="13" fill="#1f2937" /><circle cx="205" cy="574" r="5" fill="#9ca3af" />
      <circle cx="319" cy="574" r="13" fill="#1f2937" /><circle cx="319" cy="574" r="5" fill="#9ca3af" />
      <path d="M190 360 H334 L320 570 H204Z" fill="url(#wa-bin)" />
      <rect x="180" y="334" width="164" height="30" rx="12" fill="#2fa86c" />
      <rect x="240" y="320" width="44" height="14" rx="7" fill="#23895a" />
      <g fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round">
        {[0, 120, 240].map((r) => (
          <path key={r} d="M262 410 A42 42 0 0 1 303 456" transform={`rotate(${r} 262 452)`} />
        ))}
      </g>
      <g fill="#fff">
        {[0, 120, 240].map((r) => (
          <polygon key={r} points="303,462 312,452 294,451" transform={`rotate(${r} 262 452)`} />
        ))}
      </g>
      </g>
    </svg>
  );
}
