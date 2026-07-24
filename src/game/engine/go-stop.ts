import { evaluatePatterns } from '../../scoring'
import type { GameState } from './types'

export const canChooseGo = (state: Pick<GameState, 'awaitingGoStop' | 'hand' | 'deck' | 'turnsUsed' | 'unlimitedTurns'>) =>
  state.awaitingGoStop && (state.unlimitedTurns || state.turnsUsed < 10) && (state.hand.length > 0 || state.deck.length > 0)

export function chooseGo(state: GameState): GameState {
  if (!canChooseGo(state)) return state

  const currentYakuScore = evaluatePatterns(state.captured).totalScore
  return {
    ...state,
    awaitingGoStop: false,
    goCount: state.goCount + 1,
    goRequiredScore: currentYakuScore,
    lastGoChoiceYakuScore: currentYakuScore,
    phase: 'playing',
    message: `${state.goCount + 1}고! 현재 족보 ${currentYakuScore}점보다 높여야 고에 성공합니다.`,
    lastScoreEvents: [],
  }
}

export function chooseStop(state: GameState): GameState {
  if (!state.awaitingGoStop) return state

  const currentYakuScore = evaluatePatterns(state.captured).totalScore
  return {
    ...state,
    awaitingGoStop: false,
    goCount: 0,
    goRequiredScore: 0,
    lastGoChoiceYakuScore: currentYakuScore,
    phase: 'playing',
    message: `스톱! 다음 턴은 0고 · 고 배수 ×1로 진행합니다.`,
    lastScoreEvents: [],
  }
}
