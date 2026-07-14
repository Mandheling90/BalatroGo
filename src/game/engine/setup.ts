import { createDeck, shuffle } from '../core/cards/deck'
import { captureCompleteMonths } from '../core/rules/matching'
import { GameState } from './types'

export function dealRound() {
  const deck = shuffle(createDeck())
  const initialCapture = captureCompleteMonths(deck.slice(0, 8))
  return { hand: deck.slice(8, 18), deck: deck.slice(18), table: initialCapture.table, captured: initialCapture.captured, lastCapturedMonths: initialCapture.completeMonths }
}

export const createNewGame = (): GameState => ({
  round: 1, blindIndex: 0, blindHistory: ['pending', 'pending', 'pending'], target: 3, coins: 6,
  ...dealRound(), selected: null, ownedCharms: [], shopOfferIds: [], shopRerollCost: 2, phase: 'blind', pendingPhase: null,
  message: '도전할 블라인드를 확인하세요.', lastRevealed: [], lastPlayedId: null,
  lastSubmittedId: null, lastCapturedIds: [], lastMatchTarget: null, ruleBonus: 0,
  ruleDetails: [], shakenMonths: [], awaitingGoStop: false, goCount: 0, goRequiredScore: 3,
})
