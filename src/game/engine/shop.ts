import { charms } from '../modifiers/charms'
import type { BlindIndex, BlindStatus, GameState } from './types'

export const SHOP_OFFER_COUNT = 2
export const INITIAL_REROLL_COST = 2
export const MAX_OWNED_CHARMS = 5

export function createShopOffers(ownedCharmIds: string[], random: () => number = Math.random): string[] {
  const pool = charms
    .filter((charm) => !ownedCharmIds.includes(charm.id))
    .map((charm) => charm.id)

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }

  return pool.slice(0, SHOP_OFFER_COUNT)
}

export function buyShopCharm(state: GameState, charmId: string): GameState {
  const charm = charms.find((item) => item.id === charmId)
  if (!charm
    || !state.shopOfferIds.includes(charmId)
    || state.ownedCharms.includes(charmId)
    || state.ownedCharms.length >= MAX_OWNED_CHARMS
    || state.coins < charm.price
  ) return state

  return {
    ...state,
    coins: state.coins - charm.price,
    ownedCharms: [...state.ownedCharms, charmId],
    shopOfferIds: state.shopOfferIds.filter((id) => id !== charmId),
    message: `${charm.name}을 손에 넣었습니다.`,
  }
}

export function rerollShop(state: GameState, random: () => number = Math.random): GameState {
  if (state.coins < state.shopRerollCost) return state

  const cost = state.shopRerollCost
  return {
    ...state,
    coins: state.coins - cost,
    shopOfferIds: createShopOffers(state.ownedCharms, random),
    shopRerollCost: cost + 1,
    message: `${cost}냥을 내고 상점 상품을 바꿨습니다.`,
  }
}

export function leaveShop(state: GameState): GameState {
  const nextBlind = state.blindIndex === 2
    ? { round: state.round + 1, blindIndex: 0 as BlindIndex, blindHistory: ['pending', 'pending', 'pending'] as BlindStatus[] }
    : { blindIndex: (state.blindIndex + 1) as BlindIndex }

  return {
    ...state,
    ...nextBlind,
    selected: null,
    phase: 'blind',
    pendingPhase: null,
    shopOfferIds: [],
    shopRerollCost: INITIAL_REROLL_COST,
    message: state.blindIndex === 2 ? '새 앤티가 열렸습니다.' : '다음 블라인드를 선택하세요.',
    lastRevealed: [],
    lastPlayedId: null,
    lastSubmittedId: null,
    lastCapturedIds: [],
    lastScoreEvents: [],
    lastRuleEffect: null,
    lastTurnAction: null,
    lastMatchTarget: null,
  }
}
