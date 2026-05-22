/**
 * Before/after mosaic comparison SVG scene.
 * mosaic=false → original image with visible faces
 * mosaic=true  → same scene with pixelated mosaic faces
 */
export default function CompareScene({ mosaic, variant }: { mosaic: boolean; variant: number }) {
  const uid = `cs${variant}${mosaic ? "m" : "r"}`;

  const bgPairs = [
    ["#e0ddd5", "#c8cdd0"],
    ["#d2dce5", "#b8c8d8"],
    ["#cfd7d3", "#b0bcc0"],
    ["#dbd6c9", "#c0c8c0"],
  ];
  const [c1, c2] = bgPairs[variant % bgPairs.length];

  const faceColors = [
    ["#c6a589", "#e8c9a8"],
    ["#c9a07a", "#e2b990"],
    ["#c5a08a", "#dfc0a0"],
    ["#cc9e82", "#e4be9e"],
  ];
  const [faceBase, faceFill] = faceColors[variant % faceColors.length];

  const mosaicColors = [
    ["#c6a589", "#a07a5e", "#705540", "#b8967c", "#8a6b52", "#c4a085"],
    ["#c9a07a", "#aa8060", "#6e4f3a", "#c0906a", "#906050", "#d4b090"],
    ["#c5a08a", "#b08060", "#5a3f30", "#b89070", "#807050", "#d0b095"],
    ["#cc9e82", "#b08264", "#704838", "#bc9070", "#9a7055", "#d8b090"],
  ];
  const skins = mosaicColors[variant % mosaicColors.length];

  const figures = [88, 198, 314];
  const bodyColors = ["#8a96a4", "#404a55", "#5a6470"];

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
        {mosaic && (
          <pattern id={`${uid}px`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
            <line x1="0" y1="0" x2="8" y2="0" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
          </pattern>
        )}
      </defs>

      {/* Background */}
      <rect width="400" height="300" fill={`url(#${uid}g)`} />
      {/* Ceiling */}
      <rect x="0" y="0" width="400" height="36" fill="#b8bec5" opacity="0.5" />
      {/* Floor */}
      <rect y="238" width="400" height="62" fill="#9aa1a8" opacity="0.38" />
      {/* Structural lines */}
      <line x1="60" y1="0" x2="60" y2="60" stroke="#7a8088" strokeWidth="1.5" opacity="0.35" />
      <line x1="200" y1="0" x2="200" y2="80" stroke="#7a8088" strokeWidth="1.5" opacity="0.35" />
      <line x1="340" y1="0" x2="340" y2="60" stroke="#7a8088" strokeWidth="1.5" opacity="0.35" />

      {/* Figures */}
      {figures.map((cx, pi) => (
        <g key={pi}>
          {/* Body */}
          <ellipse cx={cx} cy={162} rx={26} ry={28} fill={faceBase} />
          <path
            d={`M ${cx - 28} 196 Q ${cx - 28} 256 ${cx} 256 L ${cx + 28} 256 Q ${cx + 28} 218 ${cx} 208 Q ${cx - 28} 208 ${cx - 28} 238 Z`}
            fill={bodyColors[pi % bodyColors.length]}
          />

          {mosaic ? (
            /* Mosaic face — 4×4 pixel grid */
            Array.from({ length: 16 }, (_, j) => {
              const row = Math.floor(j / 4);
              const col = j % 4;
              return (
                <rect
                  key={j}
                  x={cx - 16 + col * 8}
                  y={145 + row * 8}
                  width="8"
                  height="8"
                  fill={skins[(variant + pi + j) % skins.length]}
                />
              );
            })
          ) : (
            /* Original face — clear oval with simple features */
            <g>
              <ellipse cx={cx} cy={154} rx={15} ry={17} fill={faceFill} />
              {/* Eyes */}
              <ellipse cx={cx - 5} cy={149} rx={2.5} ry={3} fill="#3a2e28" />
              <ellipse cx={cx + 5} cy={149} rx={2.5} ry={3} fill="#3a2e28" />
              {/* Eye shine */}
              <circle cx={cx - 4} cy={148} r={0.8} fill="white" />
              <circle cx={cx + 6} cy={148} r={0.8} fill="white" />
              {/* Nose */}
              <ellipse cx={cx} cy={155} rx={1.5} ry={1} fill={faceBase} />
              {/* Mouth */}
              <path
                d={`M ${cx - 4} 162 Q ${cx} 165 ${cx + 4} 162`}
                stroke="#7a4a38"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
