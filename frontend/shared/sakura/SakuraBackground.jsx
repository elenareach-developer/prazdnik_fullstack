const PETAL_PATH = "M0 0 C -7 -6 -9 -16 -3.5 -21 L 0 -17.5 L 3.5 -21 C 9 -16 7 -6 0 0 Z";
const ANGLES = [0, 72, 144, 216, 288];

/** Five-petal sakura blossom drawn in SVG (no ids → safe to repeat on a page). */
export function SakuraFlower({ x = 0, y = 0, scale = 1, rotate = 0, className }) {
  return (
    <g className={className} transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <g className="sakura-flower-inner">
        {ANGLES.map((angle) => (
          <path key={angle} d={PETAL_PATH} transform={`rotate(${angle})`} fill="#F4A9C4" />
        ))}
        {ANGLES.map((angle) => (
          <path
            key={`in-${angle}`}
            d={PETAL_PATH}
            transform={`rotate(${angle}) scale(0.55)`}
            fill="#F8DCE8"
          />
        ))}
        {ANGLES.map((angle) => (
          <circle key={`st-${angle}`} r="1.3" cx="0" cy="-6.5" transform={`rotate(${angle + 36})`} fill="#D9B56D" />
        ))}
        <circle r="2.6" fill="#E98BAF" />
      </g>
    </g>
  );
}

/** Blooming sakura branch used in headers and the hero section. */
export function SakuraBranch({ className = "", flip = false }) {
  return (
    <svg
      className={`sakura-branch ${className}`}
      viewBox="0 0 320 200"
      aria-hidden="true"
      focusable="false"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="none" stroke="#6E4E5C" strokeLinecap="round">
        <path d="M322 18 C 260 30, 210 52, 150 92 S 60 150, 18 168" strokeWidth="6" />
        <path d="M232 46 C 222 74, 226 96, 240 116" strokeWidth="3.5" />
        <path d="M168 82 C 150 60, 132 50, 108 46" strokeWidth="3" />
        <path d="M96 132 C 100 156, 92 176, 76 190" strokeWidth="2.5" />
      </g>
      <SakuraFlower x={286} y={30} scale={1.15} rotate={10} />
      <SakuraFlower x={240} y={118} scale={0.95} rotate={-20} />
      <SakuraFlower x={204} y={58} scale={0.8} rotate={30} />
      <SakuraFlower x={152} y={96} scale={1.05} rotate={5} />
      <SakuraFlower x={106} y={44} scale={0.85} rotate={-35} />
      <SakuraFlower x={78} y={140} scale={0.95} rotate={18} />
      <SakuraFlower x={74} y={190} scale={0.7} rotate={-10} />
      <SakuraFlower x={24} y={166} scale={0.75} rotate={40} />
      <ellipse cx="180" cy="74" rx="4" ry="6" fill="#E98BAF" transform="rotate(-30 180 74)" />
      <ellipse cx="128" cy="118" rx="3.5" ry="5.5" fill="#E98BAF" transform="rotate(25 128 118)" />
      <ellipse cx="262" cy="70" rx="3.5" ry="5.5" fill="#F4A9C4" transform="rotate(10 262 70)" />
    </svg>
  );
}

/**
 * Fixed decorative backdrop: soft sky, sun, distant mountains and a pagoda.
 * Pure SVG/CSS, no images to download.
 */
export default function SakuraBackground() {
  return (
    <div className="sakura-background" aria-hidden="true">
      <div className="sakura-sun" />
      <svg className="sakura-landscape" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" focusable="false">
        <path d="M0 210 L180 120 L300 175 L470 70 L640 170 L760 120 L930 200 L1100 95 L1260 170 L1440 120 L1440 320 L0 320 Z" fill="#E8F1FC" />
        <path d="M470 70 L505 92 L490 98 L470 84 L452 100 L438 92 Z" fill="#FFFFFF" opacity="0.8" />
        <path d="M1100 95 L1132 116 L1118 121 L1100 108 L1083 122 L1070 115 Z" fill="#FFFFFF" opacity="0.8" />
        <path d="M0 260 C 200 220, 360 250, 560 232 S 940 200, 1140 238 S 1360 250, 1440 236 L1440 320 L0 320 Z" fill="#F8DCE8" opacity="0.75" />
        {/* pagoda */}
        <g fill="#493642" opacity="0.14" transform="translate(1180 150)">
          <rect x="18" y="20" width="4" height="90" />
          <path d="M-14 36 L54 36 L40 28 L0 28 Z" />
          <rect x="4" y="36" width="32" height="14" />
          <path d="M-10 58 L50 58 L38 50 L2 50 Z" />
          <rect x="6" y="58" width="28" height="14" />
          <path d="M-6 80 L46 80 L36 72 L4 72 Z" />
          <rect x="8" y="80" width="24" height="16" />
          <path d="M-18 104 L58 104 L44 96 L-4 96 Z" />
          <rect x="4" y="104" width="32" height="20" />
        </g>
        <path d="M0 290 C 260 268, 520 296, 780 280 S 1220 270, 1440 286 L1440 320 L0 320 Z" fill="#F4A9C4" opacity="0.25" />
      </svg>
    </div>
  );
}
