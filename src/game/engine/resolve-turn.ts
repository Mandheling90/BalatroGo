import { scoreCaptured } from '../../game'
import { createBonusPi } from '../core/cards/bonus'
import { HwatuCard } from '../core/cards/types'
import { matchPlayedCard } from '../core/rules/matching'
import { getFloorPosition } from './floor-layout'
import { GameState } from './types'

const emptyMatch = (table: HwatuCard[]) => ({ table, captured: [] as HwatuCard[], matched: false, swept: false })

export const shouldGameOverAfterTurn = (goCount: number, reachedTarget: boolean, remainingHandCount: number) =>
  !reachedTarget && (goCount > 0 || remainingHandCount === 0)

export function resolveGameTurn(current: GameState, pickedMatchId?: string): GameState {
  const played = current.hand.find((card) => card.id === current.selected)
  if (!played) return current

  const revealed = current.deck.slice(0, 2)
  const [firstRevealed, secondRevealed] = revealed
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
    ? isPeok ? emptyMatch(playerMatch.table) : matchPlayedCard(playerMatch.table, firstRevealed)
    : emptyMatch(playerMatch.table)
  const secondMatches = secondRevealed ? deckMatch.table.filter((card) => card.month === secondRevealed.month) : []
  const alreadyCapturedSameMonth = secondRevealed ? current.captured.filter((card) => card.month === secondRevealed.month).length : 0
  const secondExceptionCapture = secondRevealed && alreadyCapturedSameMonth > 0 && alreadyCapturedSameMonth + secondMatches.length + 1 === 4
    ? [secondRevealed, ...secondMatches] : []
  const tableAfterReveal = secondExceptionCapture.length
    ? deckMatch.table.filter((card) => card.month !== secondRevealed!.month)
    : secondRevealed ? [...deckMatch.table, secondRevealed] : deckMatch.table
  const capturedFromTable = [...playerMatch.captured, ...deckMatch.captured, ...secondExceptionCapture]
  const isTtadak = !isPeok && !isBomb && originalMatches.length === 2 && firstRevealed?.month === played.month
  const isPeokRecovery = !isBomb && originalMatches.length === 3
  const isSweep = current.table.length > 0 && (deckMatch.table.length === 0 || tableAfterReveal.length === 0) && capturedFromTable.length > 0
  const isShake = !isBomb && sameMonthHand.length === 3 && !current.shakenMonths.includes(played.month)
  const piRewardEvents = [...(isBomb ? ['폭탄'] : []), ...(isTtadak ? ['따닥'] : []), ...(isPeokRecovery ? ['뻑 먹기'] : []), ...(isSweep ? ['쓸'] : [])]
  const newlyCaptured = [...capturedFromTable, ...piRewardEvents.map(createBonusPi)]
  const captured = [...current.captured, ...newlyCaptured]
  const nextRuleBonus = current.ruleBonus + (isShake ? 1 : 0)
  const nextRuleDetails = isShake ? [...current.ruleDetails, '흔들기 +1점'] : current.ruleDetails
  const nextScore = scoreCaptured(captured, current.ownedCharms, nextRuleBonus, nextRuleDetails)
  const reachedGoTarget = nextScore.total >= current.goRequiredScore
  const failed = shouldGameOverAfterTurn(current.goCount, reachedGoTarget, remainingHand.length)
  const failedAfterGo = failed && current.goCount > 0
  const resultMessages: string[] = []
  if (isPeok) resultMessages.push(`${played.month}월 뻑! 세 장이 바닥에 묶였습니다.`)
  else if (isBomb) resultMessages.push(`${played.month}월 폭탄! 손패 세 장과 바닥패를 한꺼번에 가져왔습니다.`)
  else if (playerMatch.swept) resultMessages.push(`${played.month}월 네 장을 한꺼번에 가져왔습니다!`)
  else if (playerMatch.matched) resultMessages.push(`${played.month}월 짝을 맞춰 2장을 가져왔습니다.`)
  if (deckMatch.swept && firstRevealed) resultMessages.push(`뒤집은 ${firstRevealed.month}월 패로 네 장을 모두 가져왔습니다!`)
  else if (deckMatch.matched && firstRevealed) resultMessages.push(`뒤집은 ${firstRevealed.month}월 패가 맞아 득점패로 가져왔습니다.`)
  if (secondExceptionCapture.length && secondRevealed) resultMessages.push(`이미 획득한 ${secondRevealed.month}월의 남은 두 장이 모여 함께 가져왔습니다.`)
  if (isTtadak) resultMessages.push('따닥! 같은 월 네 장을 한 차례에 가져왔습니다.')
  if (isPeokRecovery) resultMessages.push('뻑 먹기 성공!')
  if (isShake) resultMessages.push(`${played.month}월 세 장을 흔들었습니다.`)
  if (isSweep) resultMessages.push('쓸! 바닥패를 모두 가져왔습니다.')
  if (piRewardEvents.length) resultMessages.push(`${piRewardEvents.join('·')} 보너스로 피 ${piRewardEvents.length}장을 받았습니다.`)
  if (!resultMessages.length) resultMessages.push('맞는 월이 없습니다. 바닥에 패를 놓았습니다.')
  const capturedCopy = resultMessages.join(' ')

  return {
    ...current,
    hand: remainingHand,
    deck: current.deck.slice(2),
    table: tableAfterReveal,
    captured,
    selected: null,
    phase: 'playing',
    pendingPhase: failed ? 'gameover' : null,
    gameOverReason: failedAfterGo
      ? `고 이후 다음 턴에 필요 점수 ${current.goRequiredScore}점을 달성하지 못했습니다.`
      : failed
        ? `진행 턴을 모두 사용했지만 목표 점수 ${current.goRequiredScore}점을 달성하지 못했습니다.`
        : null,
    awaitingGoStop: reachedGoTarget,
    message: reachedGoTarget ? `${capturedCopy} 필요 점수 ${current.goRequiredScore}점을 달성했습니다. 고 또는 스톱을 선택하세요.` : failedAfterGo ? `${capturedCopy} 이번 턴에 추가 점수를 내지 못해 게임오버입니다.` : failed ? `마지막 턴이 끝났습니다. ${capturedCopy}` : capturedCopy,
    lastRevealed: revealed.map((card) => card.id),
    lastCapturedMonths: Array.from(new Set([...(playerMatch.matched ? [played.month] : []), ...(deckMatch.matched && firstRevealed ? [firstRevealed.month] : []), ...(secondExceptionCapture.length && secondRevealed ? [secondRevealed.month] : [])])),
    lastPlayedId: playerMatch.matched ? null : played.id,
    lastSubmittedId: played.id,
    lastCapturedIds: newlyCaptured.map((card) => card.id),
    lastMatchTarget: getFloorPosition(played.month - 1, 12),
    ruleBonus: nextRuleBonus,
    ruleDetails: nextRuleDetails,
    shakenMonths: isShake ? [...current.shakenMonths, played.month] : current.shakenMonths,
  }
}
