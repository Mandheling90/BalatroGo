import { scoreCaptured } from '../../game'
import { getBlind } from '../data/blinds'
import type { GameState } from './types'
import { createShopOffers, INITIAL_REROLL_COST } from './shop'

export const canChooseGo = (state: Pick<GameState, 'awaitingGoStop' | 'hand'>) =>
  state.awaitingGoStop && state.hand.length > 0

export function chooseGo(state: GameState): GameState {
  if (!canChooseGo(state)) return state

  const currentScore = scoreCaptured(
    state.captured,
    state.ownedCharms,
    state.ruleBonus,
    state.ruleDetails,
  ).total
  const reward = 2 + state.goCount
  return {
    ...state,
    awaitingGoStop: false,
    goCount: state.goCount + 1,
    goRequiredScore: currentScore + 1,
    coins: state.coins + reward,
    phase: 'playing',
    message: `${state.goCount + 1}고! ${reward}냥을 받고 다음 필요 점수는 ${currentScore + 1}점입니다.`,
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
    shopOfferIds: createShopOffers(state.ownedCharms),
    shopRerollCost: INITIAL_REROLL_COST,
    message: `${state.goCount}고에서 스톱! 블라인드를 클리어했습니다.`,
  }
}
