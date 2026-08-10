export function AluboxSymbol({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: size >= 32 ? 10 : 6 }}>
      <rect width="240" height="240" fill="#101418" />
      <g stroke="#C9CDD1" strokeWidth="1.6" strokeLinecap="square">
        <path d="M56 76 H80 M56 76 V100" fill="none" />
        <path d="M184 164 H160 M184 164 V140" fill="none" />
      </g>
      <rect x="56" y="76" width="128" height="128" fill="none" stroke="#33393E" strokeWidth="1" strokeDasharray="2 4" />
      <g fill="none" stroke="#3E6E86" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 92 L82 188" />
        <path d="M120 92 L158 188" />
      </g>
      <g stroke="#F1F2F3" strokeWidth="3">
        <line x1="96" y1="152" x2="144" y2="152" />
        <line x1="93" y1="160" x2="147" y2="160" />
      </g>
      <rect x="114" y="86" width="12" height="12" fill="#101418" stroke="#C9CDD1" strokeWidth="2" />
    </svg>
  );
}
