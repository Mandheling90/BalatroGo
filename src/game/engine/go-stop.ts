import { scoreCaptured } from '../../game'
import { getBlind } from '../data/blinds'
import type { GameState } from './types'
import { createShopOffers, INITIAL_REROLL_COST } from './shop'
import { calculateBalatroScore } from '../scoring/calculate-score'

export const canChooseGo = (state: Pick<GameState, 'awaitingGoStop' | 'hand' | 'deck' | 'turnsUsed'>) =>
  state.awaitingGoStop && state.turnsUsed < 10 && (state.hand.length > 0 || state.deck.length > 0)

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
    lastScoreEvents: calculateBalatroScore({
      cards: state.captured,
      previousCards: state.captured,
      ownedCharmIds: state.ownedCharms,
      ruleBonus: state.ruleBonus,
      goCount: state.goCount + 1,
      previousGoCount: state.goCount,
    }).events,
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
