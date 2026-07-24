import { scoreCaptured } from '../../game'
import { calculateBalatroScore, getSettlementScore } from '../scoring/calculate-score'
import { getFloorPosition } from './floor-layout'
import type { GameState } from './types'
import { prepareBlindClear } from './clear-blind'

export function resolveDeckTurn(current: GameState): GameState {
  if (
    current.phase !== 'playing'
    || current.awaitingGoStop
    || (!current.unlimitedTurns && current.turnsUsed >= 10)
    || current.deck.length === 0
    || current.lastTurnAction === 'deck'
  ) return current

  const revealed = current.deck.slice(0, 2)
  const placedTable = [...current.table, ...revealed]
  const completedMonths = Array.from(new Set(revealed.map((card) => card.month)))
    .filter((month) => placedTable.filter((card) => card.month === month).length === 4)
  const newlyCaptured = placedTable.filter((card) => completedMonths.includes(card.month))
  const table = placedTable.filter((card) => !completedMonths.includes(card.month))
  const captured = [...current.captured, ...newlyCaptured]
  const turnScore = calculateBalatroScore({
    cards: captured,
    previousCards: current.captured,
    ownedCharmIds: current.ownedCharms,
    ruleBonus: current.ruleBonus,
    goCount: current.goCount,
  })
  const nextTurnsUsed = current.turnsUsed + 1
  const settlement = getSettlementScore(turnScore)
  const scoreTotal = current.scoreTotal + settlement.score
  const reachedTarget = scoreTotal >= current.target
  const nextGoStopScore = scoreCaptured(captured, current.ownedCharms, current.ruleBonus, current.ruleDetails, current.goCount).goScore
  const failed = !current.unlimitedTurns && current.goCount === 0 && !reachedTarget && nextTurnsUsed >= 10
  const reachedGoChoice = !failed && current.goCount === 0 && !reachedTarget && nextGoStopScore >= current.goRequiredScore
  const remainingDeckCount = current.deck.length - revealed.length
  const canContinueGo = (current.unlimitedTurns || nextTurnsUsed < 10) && (current.hand.length > 0 || remainingDeckCount > 0)
  const placedLabel = revealed.map((card) => `${card.month}월`).join(' · ')
  const captureLabel = completedMonths.length
    ? ` ${completedMonths.join('·')}월 네 장이 모여 모두 획득했습니다.`
    : ' 같은 월이 있어도 매칭하지 않고 바닥에 놓았습니다.'

  const result: GameState = {
    ...current,
    deck: current.deck.slice(revealed.length),
    table,
    captured,
    selected: null,
    pendingPhase: failed ? 'gameover' : null,
    gameOverReason: failed ? `10턴을 모두 사용했지만 목표 화점 ${current.target}점을 달성하지 못했습니다.` : null,
    awaitingGoStop: reachedGoChoice && canContinueGo,
    message: `덱에서 ${placedLabel} 두 장을 펼쳤습니다.${captureLabel}`,
    lastRevealed: revealed.map((card) => card.id),
    lastCapturedMonths: completedMonths,
    lastPlayedId: null,
    lastSubmittedId: null,
    lastCapturedIds: newlyCaptured.map((card) => card.id),
    lastMatchTarget: completedMonths.length ? getFloorPosition(completedMonths[0] - 1, 12) : null,
    lastScoreEvents: turnScore.events,
    lastRuleEffect: null,
    turnsUsed: nextTurnsUsed,
    lastTurnAction: 'deck',
    scoreTotal,
    lastTurnBasePoints: settlement.basePoints,
    lastTurnScore: settlement.score,
  }
  return !failed && reachedTarget ? prepareBlindClear(result) : result
}
