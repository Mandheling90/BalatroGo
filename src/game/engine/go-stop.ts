import { scoreCaptured } from '../../game'
import { getBlind } from '../data/blinds'
import type { GameState } from './types'

export function chooseGo(state: GameState): GameState {
  if (!state.awaitingGoStop) return state

  const currentScore = scoreCaptured(
    state.captured,
    state.ownedCharms,
    state.ruleBonus,
    state.ruleDetails,
  ).total
  const reward = 2 + state.goCount
  const noTurnsLeft = state.hand.length === 0

  return {
    ...state,
    awaitingGoStop: false,
    goCount: state.goCount + 1,
    goRequiredScore: currentScore + 1,
    coins: state.coins + reward,
    phase: noTurnsLeft ? 'gameover' : 'playing',
    message: noTurnsLeft
      ? `고 보상 ${reward}냥을 받았지만 낼 패가 없어 게임오버입니다.`
      : `${state.goCount + 1}고! ${reward}냥을 받고 다음 필요 점수는 ${currentScore + 1}점입니다.`,
  }
}

export function chooseStop(state: GameState): GameState {
  if (!state.awaitingGoStop) return state

  const history = [...state.blindHistory]
  history[state.blindIndex] = 'cleared'
  const blind = getBlind(state.round, state.blindIndex)

  return {
    ...state,
    awaitingGoStop: false,
    blindHistory: history,
    coins: state.coins + blind.reward + state.hand.length,
    phase: 'shop',
    message: `${state.goCount}고에서 스톱! 블라인드를 클리어했습니다.`,
  }
}
