/** A duck bobbing past a target, in the sights. */
export function Cover() {
  return (
    <svg className="cover__art" viewBox="0 0 320 200" aria-hidden="true">
      <path d="M0 150Q40 138 80 150T160 150T240 150T320 150" fill="none" stroke="var(--border-strong)" strokeWidth="4" />
      <path d="M90 132C90 112 108 104 124 108C126 94 146 88 154 102L168 100 156 110C160 126 146 138 128 138H98Z" fill="var(--text)" />
      <circle cx="146" cy="100" r="3" fill="var(--bg)" />
      <circle cx="232" cy="96" r="30" fill="none" stroke="var(--text)" strokeWidth="5" />
      <circle cx="232" cy="96" r="16" fill="none" stroke="var(--text)" strokeWidth="5" />
      <circle cx="232" cy="96" r="5" fill="var(--accent)" />
      <path d="M232 40V58M232 134V152" stroke="var(--text)" strokeWidth="5" />
      <circle cx="124" cy="120" r="22" fill="none" stroke="var(--accent)" strokeWidth="4" />
      <path d="M124 90V104M124 136V150M94 120H108M140 120H154" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
