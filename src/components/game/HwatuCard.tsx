import type { CSSProperties } from 'react'
import type { HwatuCard } from '../../game/core/cards/types'

interface HwatuCardViewProps {
  card: HwatuCard
  selected?: boolean
  compact?: boolean
  revealed?: boolean
  slapped?: boolean
  flyToScore?: boolean
  submittedCapture?: boolean
  effectIndex?: number
  effectDelayMs?: number
  onClick?: () => void
}

export function Card({
  card,
  selected = false,
  compact = false,
  revealed = false,
  slapped = false,
  flyToScore = false,
  submittedCapture = false,
  effectIndex = 0,
  effectDelayMs,
  onClick,
}: HwatuCardViewProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      className={`hwatu-card kind-${card.kind} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''} ${revealed ? 'revealed' : ''} ${slapped ? 'slapped' : ''} ${flyToScore ? 'fly-to-score' : ''} ${submittedCapture ? 'submitted-capture' : ''}`}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      style={{
        '--sprite-position': `${(card.spriteColumn / 7) * 100}% ${(card.spriteRow / 5) * 100}%`,
        '--effect-index': effectIndex,
        '--effect-delay': `${effectDelayMs ?? effectIndex * 45}ms`,
        '--fly-offset': `${(effectIndex - 1.5) * 16}px`,
      } as CSSProperties}
    >
      <span className="month">{card.month}월</span>
      <span className="plant">{card.symbol}</span>
      <span className="flower">{card.flower}</span>
    </Tag>
  )
}
