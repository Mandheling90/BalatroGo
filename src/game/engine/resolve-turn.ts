import { scoreCaptured } from '../../game'
import { createBonusPi } from '../core/cards/bonus'
import { HwatuCard } from '../core/cards/types'
import { matchPlayedCard } from '../core/rules/matching'
import { getFloorPosition } from './floor-layout'
import { GameState } from './types'
import { calculateBalatroScore, getSettlementScore } from '../scoring/calculate-score'
import { prepareBlindClear } from './clear-blind'

const emptyMatch = (table: HwatuCard[]) => ({ table, captured: [] as HwatuCard[], matched: false, swept: false })

export const shouldGameOverAfterTurn = (goCount: number, reachedTarget: boolean, remainingHandCount: number) =>
  !reachedTarget && (goCount > 0 || remainingHandCount === 0)

export function getDeckMatchCandidates(current: GameState, pickedMatchId?: string): HwatuCard[] {
  const played = current.hand.find((card) => card.id === current.selected)
  if (!played) return []

  const [firstRevealed] = current.deck
  if (!firstRevealed) return []
  const sameMonthHand = current.hand.filter((card) => card.month === played.month)
  const originalMatches = current.table.filter((card) => card.month === played.month)
  const isBomb = sameMonthHand.length === 3 && originalMatches.length === 1
  const isPeok = !isBomb && originalMatches.length === 1 && firstRevealed?.month === played.month
  const playerMatch = isPeok
    ? { table: [...current.table, played, firstRevealed], captured: [] as HwatuCard[], matched: false, swept: false }
    : isBomb
      ? { table: current.table.filter((card) => card.id !== originalMatches[0].id), captured: [...sameMonthHand, originalMatches[0]], matched: true, swept: true }
      : matchPlayedCard(current.table, played, pickedMatchId)
  return isPeok ? [] : playerMatch.table.filter((card) => card.month === firstRevealed.month)
}

export function resolveGameTurn(current: GameState, pickedMatchId?: string, pickedDeckMatchId?: string): GameState {
  const played = current.hand.find((card) => card.id === current.selected)
  if (!played) return current

  const revealed = current.deck.slice(0, 1)
  const [firstRevealed] = revealed
  const sameMonthHand = current.hand.filter((card) => card.month === played.month)
  const originalMatches = current.table.filter((card) => card.month === played.month)
  const isBomb = sameMonthHand.length === 3 && originalMatches.length === 1
  const playedCards = isBomb ? sameMonthHand : [played]
  const playedIds = new Set(playedCards.map((card) => card.id))
  const remainingHand = current.hand.filter((card) => !playedIds.has(card.id))
  const isPeok = !isBomb && originalMatches.length === 1 && firstRevealed?.month === played.month
  const playerMatch = isPeok
    ? { table: [...current.table, played, firstRevealed], captured: [] as HwatuCard[], matched: false, swept: false }
    : isBomb
      ? { table: current.table.filter((card) => card.id !== originalMatches[0].id), captured: [...playedCards, originalMatches[0]], matched: true, swept: true }
      : matchPlayedCard(current.table, played, pickedMatchId)
  const deckMatch = firstRevealed
    ? isPeok ? emptyMatch(playerMatch.table) : matchPlayedCard(playerMatch.table, firstRevealed, pickedDeckMatchId)
    : emptyMatch(playerMatch.table)
  const tableAfterReveal = deckMatch.table
  const capturedFromTable = [...playerMatch.captured, ...deckMatch.captured]
  const isTtadak = !isPeok && !isBomb && originalMatches.length === 2 && firstRevealed?.month === played.month
  const isJjok = !isPeok && !isBomb && originalMatches.length === 0 && firstRevealed?.month === played.month && deckMatch.matched
  const isPeokRecovery = !isBomb && originalMatches.length === 3
  const isSweep = current.table.length > 0 && (deckMatch.table.length === 0 || tableAfterReveal.length === 0) && capturedFromTable.length > 0
  const isShake = !isBomb && sameMonthHand.length === 3 && !current.shakenMonths.includes(played.month)
  const piRewardEvents = [...(isBomb ? ['폭탄'] : []), ...(isTtadak ? ['따닥'] : []), ...(isJjok ? ['쪽'] : []), ...(isPeokRecovery ? ['뻑 먹기'] : []), ...(isSweep ? ['쓸'] : [])]
  const newlyCaptured = [...capturedFromTable, ...piRewardEvents.map(createBonusPi)]
  const captured = [...current.captured, ...newlyCaptured]
  const nextRuleBonus = current.ruleBonus + (isShake ? 1 : 0)
  const nextRuleDetails = isShake ? [...current.ruleDetails, '흔들기 +1점'] : current.ruleDetails
  const turnScore = calculateBalatroScore({
    cards: captured,
    previousCards: current.captured,
    ownedCharmIds: current.ownedCharms,
    ruleBonus: nextRuleBonus,
    previousRuleBonus: current.ruleBonus,
    goCount: current.goCount,
  })
  const settlement = getSettlementScore(turnScore)
  const scoreTotal = current.scoreTotal + settlement.score
  const reachedTarget = scoreTotal >= current.target
  const nextGoStopScore = scoreCaptured(captured, current.ownedCharms, nextRuleBonus, nextRuleDetails, current.goCount).goScore
  const failedGo = current.goCount > 0 && nextGoStopScore < current.goRequiredScore
  const reachedGoRequirement = nextGoStopScore >= current.goRequiredScore
  const nextTurnsUsed = current.turnsUsed + 1
  const failed = failedGo || (!reachedTarget && nextTurnsUsed >= 10)
  const reachedGoChoice = !failed && !reachedTarget && reachedGoRequirement
  const canContinueGo = nextTurnsUsed < 10 && (remainingHand.length > 0 || current.deck.length > 1)
  const resultMessages: string[] = []
  if (isPeok) resultMessages.push(`${played.month}월 뻑! 세 장이 바닥에 묶였습니다.`)
  else if (isBomb) resultMessages.push(`${played.month}월 폭탄! 손패 세 장과 바닥패를 한꺼번에 가져왔습니다.`)
  else if (playerMatch.swept) resultMessages.push(`${played.month}월 네 장을 한꺼번에 가져왔습니다!`)
  else if (playerMatch.matched) resultMessages.push(`${played.month}월 짝을 맞춰 2장을 가져왔습니다.`)
  if (deckMatch.swept && firstRevealed) resultMessages.push(`뒤집은 ${firstRevealed.month}월 패로 네 장을 모두 가져왔습니다!`)
  else if (deckMatch.matched && firstRevealed) resultMessages.push(`뒤집은 ${firstRevealed.month}월 패가 맞아 득점패로 가져왔습니다.`)
  if (isTtadak) resultMessages.push('따닥! 같은 월 네 장을 한 차례에 가져왔습니다.')
  if (isJjok) resultMessages.push('쪽! 낸 패와 뒤집은 패가 맞아 보너스 피를 받았습니다.')
  if (isPeokRecovery) resultMessages.push('뻑 먹기 성공!')
  if (isShake) resultMessages.push(`${played.month}월 세 장을 흔들었습니다.`)
  if (isSweep) resultMessages.push('쓸! 바닥패를 모두 가져왔습니다.')
  if (piRewardEvents.length) resultMessages.push(`${piRewardEvents.join('·')} 보너스로 피 ${piRewardEvents.length}장을 받았습니다.`)
  if (!resultMessages.length) resultMessages.push('맞는 월이 없습니다. 바닥에 패를 놓았습니다.')
  const capturedCopy = resultMessages.join(' ')

  const result: GameState = {
    ...current,
    hand: remainingHand,
    deck: current.deck.slice(1),
    table: tableAfterReveal,
    captured,
    selected: null,
    phase: 'playing',
    pendingPhase: failed ? 'gameover' : null,
    gameOverReason: failedGo
      ? `고를 선택했지만 고스톱 점수 ${current.goRequiredScore}점을 만들지 못했습니다.`
      : failed ? `10턴을 모두 사용했지만 목표 화점 ${current.target}점을 달성하지 못했습니다.` : null,
    awaitingGoStop: reachedGoChoice && canContinueGo,
    message: failedGo ? `고 실패! ${capturedCopy}` : failed ? `마지막 턴이 끝났습니다. ${capturedCopy}` : capturedCopy,
    lastRevealed: revealed.map((card) => card.id),
    lastCapturedMonths: Array.from(new Set([...(playerMatch.matched ? [played.month] : []), ...(deckMatch.matched && firstRevealed ? [firstRevealed.month] : [])])),
    lastPlayedId: playerMatch.matched ? null : played.id,
    lastSubmittedId: played.id,
    lastCapturedIds: newlyCaptured.map((card) => card.id),
    lastMatchTarget: getFloorPosition(played.month - 1, 12),
    ruleBonus: nextRuleBonus,
    ruleDetails: nextRuleDetails,
    shakenMonths: isShake ? [...current.shakenMonths, played.month] : current.shakenMonths,
    lastScoreEvents: turnScore.events,
    lastRuleEffect: isPeok ? 'peok' : isJjok ? 'jjok' : null,
    turnsUsed: nextTurnsUsed,
    lastTurnAction: 'card',
    scoreTotal,
    lastTurnBasePoints: settlement.basePoints,
    lastTurnScore: settlement.score,
  }
  return !failed && reachedTarget ? prepareBlindClear(result) : result
}
