export default function FileThumb({ seed }: { seed: number }) {
  const uid = `ft${seed}`;
  const bgPairs = [
    ["#e0ddd5", "#c8cdd0"],
    ["#d2dce5", "#b8c8d8"],
    ["#cfd7d3", "#b0bcc0"],
    ["#dbd6c9", "#c0c8c0"],
  ];
  const [c1, c2] = bgPairs[seed % bgPairs.length];
  const skinSets = [
    ["#c6a589", "#a07a5e", "#705540", "#b8967c", "#8a6b52", "#c4a085"],
    ["#c9a07a", "#aa8060", "#6e4f3a", "#c0906a", "#906050", "#d4b090"],
    ["#c5a08a", "#b08060", "#5a3f30", "#b89070", "#807050", "#d0b095"],
    ["#cc9e82", "#b08264", "#704838", "#bc9070", "#9a7055", "#d8b090"],
  ];
  const skins = skinSets[seed % skinSets.length];
  const figures = [90, 198, 312];

  return (
    <svg
      viewBox="0 0 400 300"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${uid}g)`} />
      <rect x="0" y="0" width="400" height="36" fill="#b8bec5" opacity="0.5" />
      <rect y="238" width="400" height="62" fill="#9aa1a8" opacity="0.38" />
      <line x1="60" y1="0" x2="60" y2="60" stroke="#7a8088" strokeWidth="1.5" opacity="0.35" />
      <line x1="200" y1="0" x2="200" y2="80" stroke="#7a8088" strokeWidth="1.5" opacity="0.35" />
      <line x1="340" y1="0" x2="340" y2="60" stroke="#7a8088" strokeWidth="1.5" opacity="0.35" />
      {figures.map((cx, pi) => (
        <g key={pi}>
          <ellipse cx={cx} cy={160} rx={27} ry={29} fill={skins[(seed + pi) % 3]} />
          <path
            d={`M ${cx - 28} 196 Q ${cx - 28} 258 ${cx} 258 L ${cx + 28} 258 Q ${cx + 28} 220 ${cx} 210 Q ${cx - 28} 210 ${cx - 28} 240 Z`}
            fill={pi === 1 ? "#404a55" : pi === 0 ? "#8a96a4" : "#5a6470"}
          />
          {Array.from({ length: 16 }, (_, j) => {
            const row = Math.floor(j / 4);
            const col = j % 4;
            return (
              <rect
                key={j}
                x={cx - 16 + col * 8}
                y={143 + row * 8}
                width="8"
                height="8"
                fill={skins[(seed + pi + j) % skins.length]}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}
