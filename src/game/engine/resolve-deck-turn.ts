import { evaluatePatterns } from '../../scoring'
import { calculateBalatroScore, getSettlementScore } from '../scoring/calculate-score'
import { getFloorPosition } from './floor-layout'
import type { GameState } from './types'
import { prepareBlindClear } from './clear-blind'

export function resolveDeckTurn(current: GameState): GameState {
  if (
    current.phase !== 'playing'
    || current.awaitingGoStop
    || current.awaitingGoFailureAck
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
  const currentYakuScore = evaluatePatterns(captured).totalScore
  const goWasActive = current.goCount > 0
  const goSucceeded = goWasActive && currentYakuScore > current.goRequiredScore
  const firstChoiceReady = !goWasActive
    && currentYakuScore >= 3
    && currentYakuScore > current.lastGoChoiceYakuScore
  const nextTurnsUsed = current.turnsUsed + 1
  const remainingDeck = current.deck.slice(revealed.length)
  const hasTurnsRemaining = current.unlimitedTurns || nextTurnsUsed < 10
  const canContinue = hasTurnsRemaining && (current.hand.length > 0 || remainingDeck.length > 0)
  const goFailed = goWasActive && !goSucceeded
    && (newlyCaptured.length === 0 || remainingDeck.length === 0 || !canContinue)
  const turnScore = calculateBalatroScore({
    cards: captured,
    previousCards: current.captured,
    ownedCharmIds: current.ownedCharms,
    ruleBonus: current.ruleBonus,
    goCount: goSucceeded ? current.goCount : 0,
    previousGoCount: 0,
  })
  const settlement = getSettlementScore(turnScore)
  const settledScore = goFailed ? 0 : settlement.score
  const scoreTotal = current.scoreTotal + settledScore
  const reachedTarget = scoreTotal >= current.target
  const turnLimitFailed = !current.unlimitedTurns && !reachedTarget && nextTurnsUsed >= 10
  const reachedGoChoice = !goFailed && !turnLimitFailed && !reachedTarget
    && canContinue && (goSucceeded || firstChoiceReady)
  const placedLabel = revealed.map((card) => `${card.month}월`).join(' · ')
  const captureLabel = completedMonths.length
    ? ` ${completedMonths.join('·')}월 네 장이 모여 모두 획득했습니다.`
    : ' 같은 월이 있어도 매칭하지 않고 바닥에 놓았습니다.'

  const result: GameState = {
    ...current,
    deck: remainingDeck,
    table,
    captured,
    selected: null,
    pendingPhase: turnLimitFailed ? 'gameover' : null,
    gameOverReason: turnLimitFailed ? `10턴을 모두 사용했지만 목표 화점 ${current.target}점을 달성하지 못했습니다.` : null,
    awaitingGoStop: reachedGoChoice,
    awaitingGoFailureAck: goFailed,
    message: goFailed
      ? '고 실패! 이번 턴 획득 화점은 0점이며 고 상태를 초기화합니다.'
      : goSucceeded
        ? `고 성공! 족보 점수가 ${current.goRequiredScore}점에서 ${currentYakuScore}점으로 올랐습니다.`
        : `덱에서 ${placedLabel} 두 장을 펼쳤습니다.${captureLabel}`,
    lastRevealed: revealed.map((card) => card.id),
    lastCapturedMonths: completedMonths,
    lastPlayedId: null,
    lastSubmittedId: null,
    lastCapturedIds: newlyCaptured.map((card) => card.id),
    lastMatchTarget: completedMonths.length ? getFloorPosition(completedMonths[0] - 1, 12) : null,
    lastScoreEvents: goFailed ? [] : turnScore.events,
    lastRuleEffect: null,
    turnsUsed: nextTurnsUsed,
    lastTurnAction: 'deck',
    scoreTotal,
    lastTurnBasePoints: goFailed ? 0 : settlement.basePoints,
    lastTurnScore: settledScore,
    lastTurnMultiplier: goFailed ? 1 : turnScore.multiplier,
    lastTurnFinalMultiplier: goFailed ? 1 : turnScore.finalMultiplier,
    goCount: goFailed ? 0 : current.goCount,
    goRequiredScore: goFailed ? 0 : current.goRequiredScore,
    lastGoChoiceYakuScore: reachedGoChoice || goFailed ? currentYakuScore : current.lastGoChoiceYakuScore,
  }
  return !turnLimitFailed && !goFailed && reachedTarget ? prepareBlindClear(result) : result
}
