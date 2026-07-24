import { scoreCaptured } from '../../game'
import type { GameState } from './types'

export const canChooseGo = (state: Pick<GameState, 'awaitingGoStop' | 'hand' | 'deck' | 'turnsUsed' | 'unlimitedTurns'>) =>
  state.awaitingGoStop && (state.unlimitedTurns || state.turnsUsed < 10) && (state.hand.length > 0 || state.deck.length > 0)

export function chooseGo(state: GameState): GameState {
  if (!canChooseGo(state)) return state

  const currentGoScore = scoreCaptured(
    state.captured,
    state.ownedCharms,
    state.ruleBonus,
    state.ruleDetails,
    state.goCount,
  ).goScore
  return {
    ...state,
    awaitingGoStop: false,
    goCount: state.goCount + 1,
    goRequiredScore: currentGoScore + 1,
    phase: 'playing',
    message: `${state.goCount + 1}고! 다음 고스톱 점수는 ${currentGoScore + 1}점이 필요합니다.`,
    lastScoreEvents: [],
  }
}
