import type { CardKind } from '../core/cards/types'

export const cardPointConfig: Record<CardKind, number> = {
  pi: 5,
  'ribbon-red': 10,
  'ribbon-blue': 10,
  'ribbon-plain': 10,
  animal: 20,
  gwang: 30,
}

export const scorePlaybackConfig = {
  startDelayMs: 1250,
  eventDelayMs: 450,
  strongDelayMs: 620,
  multiplyDelayMs: 700,
  goMultiplyDelayMs: 700,
  countUpMs: 950,
} as const

export const goAdditiveMultiplierConfig = [0, 1, 2] as const

export const getGoAdditiveMultiplier = (goCount: number) =>
  goAdditiveMultiplierConfig[goCount] ?? 0

export const getGoFinalMultiplier = (goCount: number) =>
  goCount < 3 ? 1 : goCount - 1
