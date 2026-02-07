interface Props {
  days: number
}

// Evolving visual metaphor: seed → sprout → sapling → tree → full tree → golden tree
export default function GrowthTree({ days }: Props) {
  const getStage = () => {
    if (days < 1) return 'seed'
    if (days < 7) return 'sprout'
    if (days < 21) return 'sapling'
    if (days < 45) return 'young-tree'
    if (days < 90) return 'tree'
    if (days < 180) return 'full-tree'
    return 'golden-tree'
  }

  const stage = getStage()

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full">
          {/* Ground */}
          <ellipse cx="40" cy="72" rx="20" ry="3" fill="var(--color-accent)" opacity="0.1" />

          {stage === 'seed' && <Seed />}
          {stage === 'sprout' && <Sprout />}
          {stage === 'sapling' && <Sapling />}
          {stage === 'young-tree' && <YoungTree />}
          {stage === 'tree' && <Tree />}
          {stage === 'full-tree' && <FullTree />}
          {stage === 'golden-tree' && <GoldenTree />}
        </svg>
      </div>
      <span className="text-text-muted text-[10px] mt-1 capitalize">{stage.replace('-', ' ')}</span>
    </div>
  )
}

function Seed() {
  return (
    <g className="animate-fade-in">
      <ellipse cx="40" cy="65" rx="6" ry="4" fill="var(--color-accent-dim)" />
      <ellipse cx="40" cy="64" rx="4" ry="3" fill="var(--color-accent)" opacity="0.5" />
    </g>
  )
}

function Sprout() {
  return (
    <g className="animate-fade-in">
      {/* Stem */}
      <path d="M40 68 L40 52" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" />
      {/* Leaves */}
      <path d="M40 56 Q34 50 38 46" stroke="var(--color-success)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M40 56 Q46 50 42 46" stroke="var(--color-success)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Seed */}
      <ellipse cx="40" cy="68" rx="4" ry="3" fill="var(--color-accent-dim)" />
    </g>
  )
}

function Sapling() {
  return (
    <g className="animate-fade-in">
      {/* Trunk */}
      <path d="M40 70 L40 40" stroke="#6b5b3a" strokeWidth="3" strokeLinecap="round" />
      {/* Branches */}
      <path d="M40 50 Q32 44 28 38" stroke="#5a4d32" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M40 45 Q48 39 52 33" stroke="#5a4d32" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Leaves */}
      <circle cx="28" cy="36" r="6" fill="var(--color-success)" opacity="0.7" />
      <circle cx="52" cy="31" r="6" fill="var(--color-success)" opacity="0.7" />
      <circle cx="40" cy="34" r="7" fill="var(--color-success)" opacity="0.8" />
    </g>
  )
}

function YoungTree() {
  return (
    <g className="animate-fade-in">
      {/* Trunk */}
      <path d="M40 70 L40 35" stroke="#6b5b3a" strokeWidth="4" strokeLinecap="round" />
      {/* Branches */}
      <path d="M40 50 Q30 42 24 36" stroke="#5a4d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 45 Q50 37 56 31" stroke="#5a4d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 40 Q34 34 30 28" stroke="#5a4d32" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Canopy */}
      <circle cx="24" cy="33" r="8" fill="var(--color-success)" opacity="0.6" />
      <circle cx="56" cy="28" r="8" fill="var(--color-success)" opacity="0.6" />
      <circle cx="30" cy="24" r="7" fill="var(--color-success)" opacity="0.75" />
      <circle cx="40" cy="28" r="10" fill="var(--color-success)" opacity="0.8" />
      <circle cx="48" cy="22" r="7" fill="var(--color-success)" opacity="0.75" />
    </g>
  )
}

function Tree() {
  return (
    <g className="animate-fade-in">
      {/* Trunk */}
      <path d="M40 70 L40 30" stroke="#6b5b3a" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 55 Q28 45 22 38" stroke="#5a4d32" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 48 Q52 38 58 30" stroke="#5a4d32" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 42 Q32 34 26 26" stroke="#5a4d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 38 Q48 28 54 22" stroke="#5a4d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Full canopy */}
      <circle cx="22" cy="34" r="10" fill="var(--color-success)" opacity="0.5" />
      <circle cx="58" cy="27" r="10" fill="var(--color-success)" opacity="0.5" />
      <circle cx="26" cy="22" r="9" fill="var(--color-success)" opacity="0.65" />
      <circle cx="54" cy="18" r="9" fill="var(--color-success)" opacity="0.65" />
      <circle cx="40" cy="20" r="14" fill="var(--color-success)" opacity="0.7" />
      <circle cx="34" cy="14" r="8" fill="var(--color-success)" opacity="0.8" />
      <circle cx="46" cy="12" r="8" fill="var(--color-success)" opacity="0.8" />
      {/* Glow */}
      <circle cx="40" cy="22" r="20" fill="var(--color-success)" opacity="0.08" />
    </g>
  )
}

function FullTree() {
  return (
    <g className="animate-fade-in">
      {/* Trunk */}
      <path d="M40 70 L40 28" stroke="#6b5b3a" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 55 Q25 42 18 34" stroke="#5a4d32" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 48 Q55 35 62 26" stroke="#5a4d32" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 40 Q28 30 22 22" stroke="#5a4d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 35 Q52 24 58 16" stroke="#5a4d32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Dense canopy */}
      <circle cx="18" cy="30" r="12" fill="var(--color-success)" opacity="0.4" />
      <circle cx="62" cy="22" r="12" fill="var(--color-success)" opacity="0.4" />
      <circle cx="22" cy="18" r="11" fill="var(--color-success)" opacity="0.55" />
      <circle cx="58" cy="13" r="11" fill="var(--color-success)" opacity="0.55" />
      <circle cx="40" cy="16" r="16" fill="var(--color-success)" opacity="0.6" />
      <circle cx="30" cy="10" r="10" fill="var(--color-success)" opacity="0.7" />
      <circle cx="50" cy="8" r="10" fill="var(--color-success)" opacity="0.7" />
      <circle cx="40" cy="6" r="8" fill="var(--color-success)" opacity="0.8" />
      {/* Glow */}
      <circle cx="40" cy="18" r="26" fill="var(--color-success)" opacity="0.06" />
    </g>
  )
}

function GoldenTree() {
  return (
    <g className="animate-fade-in">
      {/* Trunk */}
      <path d="M40 70 L40 28" stroke="#8b7355" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 55 Q25 42 18 34" stroke="#7a6548" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 48 Q55 35 62 26" stroke="#7a6548" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 40 Q28 30 22 22" stroke="#7a6548" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40 35 Q52 24 58 16" stroke="#7a6548" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Golden canopy */}
      <circle cx="18" cy="30" r="12" fill="#fbbf24" opacity="0.3" />
      <circle cx="62" cy="22" r="12" fill="#fbbf24" opacity="0.3" />
      <circle cx="22" cy="18" r="11" fill="#f59e0b" opacity="0.4" />
      <circle cx="58" cy="13" r="11" fill="#f59e0b" opacity="0.4" />
      <circle cx="40" cy="16" r="16" fill="#fbbf24" opacity="0.5" />
      <circle cx="30" cy="10" r="10" fill="#f59e0b" opacity="0.6" />
      <circle cx="50" cy="8" r="10" fill="#f59e0b" opacity="0.6" />
      <circle cx="40" cy="6" r="8" fill="#fcd34d" opacity="0.7" />
      {/* Golden glow */}
      <circle cx="40" cy="18" r="30" fill="#fbbf24" opacity="0.06" className="animate-pulse-slow" />
      <circle cx="40" cy="18" r="20" fill="#fbbf24" opacity="0.04" />
    </g>
  )
}
