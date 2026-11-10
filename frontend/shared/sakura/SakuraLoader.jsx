import { SakuraFlower } from "./SakuraBackground";

/** Small blooming branch shown while AI (or anything slow) is working. */
export default function SakuraLoader({ text = "Подбираем идеи для вашего праздника..." }) {
  return (
    <div className="sakura-loader" role="status" aria-live="polite">
      <svg viewBox="0 0 150 60" aria-hidden="true" focusable="false">
        <path d="M6 48 C 40 40, 80 34, 144 14" fill="none" stroke="#6E4E5C" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 37 C 74 26, 82 20, 92 18" fill="none" stroke="#6E4E5C" strokeWidth="2" strokeLinecap="round" />
        <SakuraFlower className="sakura-bloom sakura-bloom--1" x={36} y={42} scale={0.65} rotate={-10} />
        <SakuraFlower className="sakura-bloom sakura-bloom--2" x={92} y={18} scale={0.7} rotate={20} />
        <SakuraFlower className="sakura-bloom sakura-bloom--3" x={128} y={20} scale={0.6} rotate={45} />
      </svg>
      <span>{text}</span>
    </div>
  );
}
