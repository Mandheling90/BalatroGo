import { getBlind } from '../data/blinds'
import { createShopOffers, INITIAL_REROLL_COST } from './shop'
import type { GameState } from './types'

export function prepareBlindClear(state: GameState): GameState {
  const history = [...state.blindHistory]
  history[state.blindIndex] = 'cleared'
  const blind = getBlind(state.round, state.blindIndex)
  return {
    ...state,
    awaitingGoStop: false,
    blindHistory: history,
    coins: state.coins + blind.reward + state.hand.length,
    pendingPhase: 'shop',
    shopOfferIds: createShopOffers(state.ownedCharms),
    shopRerollCost: INITIAL_REROLL_COST,
    message: `목표 화점 ${state.target}점을 달성해 ${blind.name}를 클리어했습니다.`,
  }
}
