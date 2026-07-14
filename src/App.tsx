import { useEffect, useMemo, useState } from 'react'
import { CardKind, charms, createDeck, HwatuCard, scoreCaptured, shuffle } from './game'

type Phase = 'blind' | 'playing' | 'shop' | 'gameover'
type BlindIndex = 0 | 1 | 2
type BlindStatus = 'pending' | 'cleared' | 'skipped'
type HandSort = 'month' | 'kind'

const handKindOrder: Record<CardKind, number> = {
  gwang: 0,
  animal: 1,
  'ribbon-red': 2,
  'ribbon-blue': 2,
  'ribbon-plain': 2,
  pi: 3,
}

const blindDefinitions = [
  { name: '스몰 블라인드', english: 'SMALL BLIND', icon: '小', targetBonus: 0, reward: 3, color: '#6db7dc' },
  { name: '빅 블라인드', english: 'BIG BLIND', icon: '大', targetBonus: 2, reward: 5, color: '#e3a94f' },
  { name: '보스 블라인드', english: 'BOSS BLIND', icon: '王', targetBonus: 4, reward: 8, color: '#df5544' },
] as const

const getBlind = (ante: number, index: BlindIndex) => ({
  ...blindDefinitions[index],
  target: 3 + (ante - 1) * 2 + blindDefinitions[index].targetBonus,
})

interface GameState {
  round: number
  blindIndex: BlindIndex
  blindHistory: BlindStatus[]
  target: number
  coins: number
  deck: HwatuCard[]
  hand: HwatuCard[]
  table: HwatuCard[]
  captured: HwatuCard[]
  selected: string | null
  ownedCharms: string[]
  phase: Phase
  pendingPhase: 'shop' | 'gameover' | null
  message: string
  lastRevealed: string[]
  lastCapturedMonths: number[]
  lastPlayedId: string | null
  lastSubmittedId: string | null
  lastCapturedIds: string[]
  lastMatchTarget: { x: number; y: number } | null
  ruleBonus: number
  ruleDetails: string[]
  shakenMonths: number[]
  awaitingGoStop: boolean
  goCount: number
  goRequiredScore: number
}

function captureCompleteMonths(table: HwatuCard[]) {
  const completeMonths = Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) => table.filter((card) => card.month === month).length === 4)
  return {
    completeMonths,
    captured: table.filter((card) => completeMonths.includes(card.month)),
    table: table.filter((card) => !completeMonths.includes(card.month)),
  }
}

function matchPlayedCard(table: HwatuCard[], played: HwatuCard, pickedMatchId?: string) {
  const matches = table.filter((card) => card.month === played.month)

  if (matches.length === 0) {
    return { table: [...table, played], captured: [] as HwatuCard[], matched: false, swept: false }
  }

  if (matches.length === 3) {
    return {
      table: table.filter((card) => card.month !== played.month),
      captured: [played, ...matches],
      matched: true,
      swept: true,
    }
  }

  const picked = matches.find((card) => card.id === pickedMatchId) ?? matches[0]
  return {
    table: table.filter((card) => card.id !== picked.id),
    captured: [played, picked],
    matched: true,
    swept: false,
  }
}

function dealRound() {
  const deck = shuffle(createDeck())
  const initialTable = deck.slice(0, 8)
  const initialCapture = captureCompleteMonths(initialTable)
  return {
    hand: deck.slice(8, 18),
    deck: deck.slice(18),
    table: initialCapture.table,
    captured: initialCapture.captured,
    lastCapturedMonths: initialCapture.completeMonths,
  }
}

const newGame = (): GameState => ({
  round: 1,
  blindIndex: 0,
  blindHistory: ['pending', 'pending', 'pending'],
  target: 3,
  coins: 6,
  ...dealRound(),
  selected: null,
  ownedCharms: [],
  phase: 'blind',
  pendingPhase: null,
  message: '도전할 블라인드를 확인하세요.',
  lastRevealed: [],
  lastPlayedId: null,
  lastSubmittedId: null,
  lastCapturedIds: [],
  lastMatchTarget: null,
  ruleBonus: 0,
  ruleDetails: [],
  shakenMonths: [],
  awaitingGoStop: false,
  goCount: 0,
  goRequiredScore: 3,
})

const categoryCards = (cards: HwatuCard[], category: 'gwang' | 'animal' | 'ribbon' | 'pi') =>
  cards.filter((card) => category === 'ribbon' ? card.kind.startsWith('ribbon') : card.kind === category)

const createBonusPi = (event: string, index: number): HwatuCard => ({
  id: `bonus-pi-${event}-${Date.now()}-${index}`,
  definitionId: 'bonus-pi',
  month: 0,
  spriteRow: 0,
  spriteColumn: 2,
  flower: '보너스',
  symbol: '피',
  kind: 'pi',
  title: `${event} 보너스 피`,
  chips: 2,
  piValue: 1,
})

function getFloorPosition(index: number, total: number) {
  const outerCount = total > 18 ? Math.ceil(total * 0.64) : total
  const inner = index >= outerCount
  const ringIndex = inner ? index - outerCount : index
  const ringCount = inner ? total - outerCount : outerCount
  const angle = -Math.PI / 2 + (Math.PI * 2 * ringIndex) / Math.max(1, ringCount)
  const radiusX = inner ? 26 : 43
  const radiusY = inner ? 19 : 31
  return {
    x: 50 + Math.cos(angle) * radiusX,
    y: 50 + Math.sin(angle) * radiusY,
  }
}

function Card({ card, selected = false, compact = false, revealed = false, slapped = false, flyToScore = false, submittedCapture = false, effectIndex = 0, effectDelayMs, onClick }: {
  card: HwatuCard
  selected?: boolean
  compact?: boolean
  revealed?: boolean
  slapped?: boolean
  flyToScore?: boolean
  submittedCapture?: boolean
  effectIndex?: number
  effectDelayMs?: number
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`hwatu-card kind-${card.kind} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''} ${revealed ? 'revealed' : ''} ${slapped ? 'slapped' : ''} ${flyToScore ? 'fly-to-score' : ''} ${submittedCapture ? 'submitted-capture' : ''}`}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      style={{
        '--sprite-position': `${(card.spriteColumn / 7) * 100}% ${(card.spriteRow / 5) * 100}%`,
        '--effect-index': effectIndex,
        '--effect-delay': `${effectDelayMs ?? effectIndex * 45}ms`,
        '--fly-offset': `${(effectIndex - 1.5) * 16}px`,
      } as React.CSSProperties}
    >
      <span className="month">{card.month}월</span>
      <span className="plant">{card.symbol}</span>
      <span className="flower">{card.flower}</span>
    </Tag>
  )
}

function App() {
  const [game, setGame] = useState<GameState>(newGame)
  const [showRules, setShowRules] = useState(false)
  const [matchChoice, setMatchChoice] = useState<{ playedId: string; matchIds: string[] } | null>(null)
  const [handSort, setHandSort] = useState<HandSort>('month')
  const [isResolving, setIsResolving] = useState(false)
  const [submitFlight, setSubmitFlight] = useState({ fromX: 0, fromY: 0, toX: 0, toY: 0 })
  const score = useMemo(
    () => scoreCaptured(game.captured, game.ownedCharms, game.ruleBonus, game.ruleDetails),
    [game.captured, game.ownedCharms, game.ruleBonus, game.ruleDetails],
  )
  const currentBlind = getBlind(game.round, game.blindIndex)
  const selectedMonth = game.hand.find((card) => card.id === game.selected)?.month
  const turn = 11 - game.hand.length
  const sortedHand = useMemo(() => [...game.hand].sort((a, b) => {
    if (handSort === 'kind') {
      const kindDifference = handKindOrder[a.kind] - handKindOrder[b.kind]
      if (kindDifference) return kindDifference
    }
    return a.month - b.month || a.spriteColumn - b.spriteColumn
  }), [game.hand, handSort])
  const floorGroups = useMemo(() => Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    cards: game.table.filter((card) => card.month === index + 1),
  })).filter((group) => group.cards.length > 0), [game.table])
  const submittedAnimationCard = [...game.table, ...game.captured].find((card) => card.id === game.lastSubmittedId)
  const matchedTargetCards = game.captured.filter((card) =>
    game.lastCapturedIds.includes(card.id)
      && card.id !== game.lastSubmittedId
      && !game.lastRevealed.includes(card.id)
      && card.month >= 1,
  )
  const capturedRevealedCards = game.captured.filter((card) => game.lastRevealed.includes(card.id))
  const getCaptureEffectDelay = (card: HwatuCard) => {
    const matchingRevealIndex = capturedRevealedCards.findIndex((revealed) => revealed.month === card.month)
    return matchingRevealIndex >= 0 ? 1200 + matchingRevealIndex * 900 : 550
  }

  useEffect(() => {
    const tryLandscapeLock = () => {
      const orientation = window.screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>
      }
      orientation.lock?.('landscape').catch(() => undefined)
    }
    window.addEventListener('pointerdown', tryLandscapeLock, { once: true })
    return () => window.removeEventListener('pointerdown', tryLandscapeLock)
  }, [])

  useEffect(() => {
    if (!game.lastPlayedId && !game.lastCapturedIds.length) return
    if ('vibrate' in navigator) {
      navigator.vibrate(game.lastCapturedIds.length ? [18, 22, 32] : 18)
    }
  }, [game.lastPlayedId, game.lastCapturedIds])

  useEffect(() => {
    if (!game.pendingPhase) return
    const timer = window.setTimeout(() => {
      setGame((current) => current.pendingPhase
        ? { ...current, phase: current.pendingPhase, pendingPhase: null }
        : current)
    }, 2700)
    return () => window.clearTimeout(timer)
  }, [game.pendingPhase])

  const resolveTurn = (pickedMatchId?: string) => {
    const floor = document.querySelector<HTMLElement>('.floor-spread')
    const selectedCard = document.querySelector<HTMLElement>('.player-hand .hwatu-card[aria-pressed="true"]')
    const previewPlayed = game.hand.find((card) => card.id === game.selected)
    if (floor && selectedCard && previewPlayed) {
      const floorRect = floor.getBoundingClientRect()
      const cardRect = selectedCard.getBoundingClientRect()
      const previewTarget = getFloorPosition(previewPlayed.month - 1, 12)
      setSubmitFlight({
        fromX: cardRect.left + cardRect.width / 2,
        fromY: cardRect.top + cardRect.height / 2,
        toX: floorRect.left + floorRect.width * previewTarget.x / 100,
        toY: floorRect.top + floorRect.height * previewTarget.y / 100,
      })
    }
    setMatchChoice(null)
    setIsResolving(true)
    window.setTimeout(() => setIsResolving(false), 2700)
    setGame((current) => {
      const played = current.hand.find((card) => card.id === current.selected)
      if (!played) return current

      const revealed = current.deck.slice(0, 2)
      const firstRevealed = revealed[0]
      const secondRevealed = revealed[1]
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
          ? {
              table: current.table.filter((card) => card.id !== originalMatches[0].id),
              captured: [...playedCards, originalMatches[0]],
              matched: true,
              swept: true,
            }
          : matchPlayedCard(current.table, played, pickedMatchId)
      const deckMatch = firstRevealed
        ? isPeok
          ? { table: playerMatch.table, captured: [] as HwatuCard[], matched: false, swept: false }
          : matchPlayedCard(playerMatch.table, firstRevealed)
        : { table: playerMatch.table, captured: [] as HwatuCard[], matched: false, swept: false }
      const secondMatches = secondRevealed
        ? deckMatch.table.filter((card) => card.month === secondRevealed.month)
        : []
      const alreadyCapturedSameMonth = secondRevealed
        ? current.captured.filter((card) => card.month === secondRevealed.month).length
        : 0
      const secondExceptionCapture = secondRevealed
        && alreadyCapturedSameMonth > 0
        && alreadyCapturedSameMonth + secondMatches.length + 1 === 4
        ? [secondRevealed, ...secondMatches]
        : []
      const tableAfterReveal = secondExceptionCapture.length
        ? deckMatch.table.filter((card) => card.month !== secondRevealed!.month)
        : secondRevealed ? [...deckMatch.table, secondRevealed] : deckMatch.table
      const matchTarget = getFloorPosition(played.month - 1, 12)
      const capturedFromTable = [...playerMatch.captured, ...deckMatch.captured, ...secondExceptionCapture]
      const isTtadak = !isPeok && !isBomb && originalMatches.length === 2 && firstRevealed?.month === played.month
      const isPeokRecovery = !isBomb && originalMatches.length === 3
      const isSweep = current.table.length > 0
        && (deckMatch.table.length === 0 || tableAfterReveal.length === 0)
        && capturedFromTable.length > 0
      const isShake = !isBomb && sameMonthHand.length === 3 && !current.shakenMonths.includes(played.month)
      const piRewardEvents = [
        ...(isBomb ? ['폭탄'] : []),
        ...(isTtadak ? ['따닥'] : []),
        ...(isPeokRecovery ? ['뻑 먹기'] : []),
        ...(isSweep ? ['쓸'] : []),
      ]
      const bonusPiCards = piRewardEvents.map(createBonusPi)
      const newlyCaptured = [...capturedFromTable, ...bonusPiCards]
      const captured = [...current.captured, ...newlyCaptured]
      const nextRuleBonus = current.ruleBonus + (isShake ? 1 : 0)
      const nextRuleDetails = isShake
        ? [...current.ruleDetails, '흔들기 +1점']
        : current.ruleDetails
      const nextScore = scoreCaptured(captured, current.ownedCharms, nextRuleBonus, nextRuleDetails)
      const reachedGoTarget = nextScore.total >= current.goRequiredScore
      const failed = !reachedGoTarget && remainingHand.length === 0
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
        awaitingGoStop: reachedGoTarget,
        message: reachedGoTarget
          ? `${capturedCopy} 필요 점수 ${current.goRequiredScore}점을 달성했습니다. 고 또는 스톱을 선택하세요.`
          : failed ? `마지막 턴이 끝났습니다. ${capturedCopy}` : capturedCopy,
        lastRevealed: revealed.map((card) => card.id),
        lastCapturedMonths: Array.from(new Set([
          ...(playerMatch.matched ? [played.month] : []),
          ...(deckMatch.matched && firstRevealed ? [firstRevealed.month] : []),
          ...(secondExceptionCapture.length && secondRevealed ? [secondRevealed.month] : []),
        ])),
        lastPlayedId: playerMatch.matched ? null : played.id,
        lastSubmittedId: played.id,
        lastCapturedIds: newlyCaptured.map((card) => card.id),
        lastMatchTarget: matchTarget,
        ruleBonus: nextRuleBonus,
        ruleDetails: nextRuleDetails,
        shakenMonths: isShake ? [...current.shakenMonths, played.month] : current.shakenMonths,
      }
    })
  }

  const playTurn = () => {
    if (!game.selected || game.phase !== 'playing' || game.awaitingGoStop) return
    const played = game.hand.find((card) => card.id === game.selected)
    if (!played) return
    const matches = game.table.filter((card) => card.month === played.month)
    if (matches.length === 2) {
      setMatchChoice({ playedId: played.id, matchIds: matches.map((card) => card.id) })
      return
    }
    resolveTurn()
  }

  const startBlind = () => {
    setMatchChoice(null)
    setGame((current) => {
      const blind = getBlind(current.round, current.blindIndex)
      return {
        ...current,
        ...dealRound(),
        target: blind.target,
        selected: null,
        phase: 'playing',
        pendingPhase: null,
        message: `${blind.name} 시작. 손패 한 장을 골라 바닥에 놓으세요.`,
        lastRevealed: [],
        lastPlayedId: null,
        lastSubmittedId: null,
        lastCapturedIds: [],
        lastMatchTarget: null,
        ruleBonus: 0,
        ruleDetails: [],
        shakenMonths: [],
        awaitingGoStop: false,
        goCount: 0,
        goRequiredScore: blind.target,
      }
    })
  }

  const chooseGo = () => {
    setGame((current) => {
      if (!current.awaitingGoStop) return current
      const currentScore = scoreCaptured(current.captured, current.ownedCharms, current.ruleBonus, current.ruleDetails).total
      const reward = 2 + current.goCount
      const noTurnsLeft = current.hand.length === 0
      return {
        ...current,
        awaitingGoStop: false,
        goCount: current.goCount + 1,
        goRequiredScore: currentScore + 1,
        coins: current.coins + reward,
        phase: noTurnsLeft ? 'gameover' : 'playing',
        message: noTurnsLeft
          ? `고 보상 ${reward}냥을 받았지만 더 낼 패가 없어 게임오버입니다.`
          : `${current.goCount + 1}고! ${reward}냥을 받고 다음 필요 점수는 ${currentScore + 1}점입니다.`,
      }
    })
  }

  const chooseStop = () => {
    setGame((current) => {
      if (!current.awaitingGoStop) return current
      const history = [...current.blindHistory]
      history[current.blindIndex] = 'cleared'
      const blind = getBlind(current.round, current.blindIndex)
      return {
        ...current,
        awaitingGoStop: false,
        blindHistory: history,
        coins: current.coins + blind.reward + current.hand.length,
        phase: 'shop',
        message: `${current.goCount}고에서 스톱! 블라인드를 클리어했습니다.`,
      }
    })
  }

  const skipBlind = () => {
    if (game.blindIndex === 2) return
    setGame((current) => {
      const history = [...current.blindHistory]
      history[current.blindIndex] = 'skipped'
      const nextIndex = (current.blindIndex + 1) as BlindIndex
      return {
        ...current,
        blindIndex: nextIndex,
        blindHistory: history,
        target: getBlind(current.round, nextIndex).target,
        phase: 'blind',
        message: `${blindDefinitions[current.blindIndex].name}를 패스했습니다.`,
      }
    })
  }

  const buyCharm = (id: string) => {
    const charm = charms.find((item) => item.id === id)
    if (!charm || game.coins < charm.price || game.ownedCharms.includes(id)) return
    setGame((current) => ({
      ...current,
      coins: current.coins - charm.price,
      ownedCharms: [...current.ownedCharms, id],
      message: `${charm.name}을 손에 넣었습니다.`,
    }))
  }

  const nextBlind = () => {
    setGame((current) => ({
      ...current,
      ...(current.blindIndex === 2
        ? { round: current.round + 1, blindIndex: 0 as BlindIndex, blindHistory: ['pending', 'pending', 'pending'] as BlindStatus[] }
        : { blindIndex: (current.blindIndex + 1) as BlindIndex }),
      selected: null,
      phase: 'blind',
      pendingPhase: null,
      message: current.blindIndex === 2 ? '새 앤티가 열렸습니다.' : '다음 블라인드를 선택하세요.',
      lastRevealed: [],
      lastPlayedId: null,
      lastSubmittedId: null,
      lastCapturedIds: [],
      lastMatchTarget: null,
    }))
  }

  const capturedGroups = [
    { key: 'gwang' as const, label: '광', score: score.gwang },
    { key: 'animal' as const, label: '열끗', score: score.animal },
    { key: 'ribbon' as const, label: '띠', score: score.ribbon },
    { key: 'pi' as const, label: '피', score: score.pi },
  ]

  return (
    <main className={`game-shell capture-game ${isResolving ? 'is-resolving' : ''}`}>
      <div className="rotate-device" aria-hidden="true">
        <div className="rotate-phone">↻</div>
        <strong>가로로 돌려주세요</strong>
        <span>화투록은 가로 화면에 맞춰져 있습니다.</span>
      </div>
      {game.phase === 'blind' && <header className="topbar">
        <div className="brand">
          <span className="brand-mark">花</span>
          <div><h1>화투록</h1><p>네 장을 맞추고, 점수패를 모아라</p></div>
        </div>
        <button className="text-button" onClick={() => setShowRules(true)}>게임 방법</button>
      </header>}

      {game.phase === 'blind' ? (
        <section className="blind-select-screen">
          <div className="blind-heading">
            <span>ANTE {game.round}</span>
            <h2>블라인드를 선택하세요</h2>
            <p>스몰과 빅 블라인드는 패스할 수 있지만, 보스는 반드시 쓰러뜨려야 합니다.</p>
          </div>
          <div className="blind-path">
            {blindDefinitions.map((definition, index) => {
              const blindIndex = index as BlindIndex
              const blind = getBlind(game.round, blindIndex)
              const status = game.blindHistory[index]
              const isCurrent = game.blindIndex === blindIndex
              const isLocked = index > game.blindIndex
              return (
                <article
                  className={`blind-card ${isCurrent ? 'current' : ''} ${status} ${isLocked ? 'locked' : ''}`}
                  style={{ '--blind-color': definition.color } as React.CSSProperties}
                  key={definition.english}
                >
                  <div className="blind-token"><span>{definition.icon}</span></div>
                  <span className="blind-order">{definition.english}</span>
                  <h3>{definition.name}</h3>
                  <div className="blind-stakes">
                    <div><span>목표</span><strong>{blind.target}점</strong></div>
                    <div><span>보상</span><strong>{blind.reward}냥 + 잔여 턴</strong></div>
                  </div>
                  {status !== 'pending' && <div className="blind-result">{status === 'cleared' ? '완료' : '패스'}</div>}
                  {isLocked && <div className="blind-result">잠김</div>}
                  {isCurrent && status === 'pending' && (
                    <div className="blind-actions">
                      <button className="challenge-blind" onClick={startBlind}>도전하기</button>
                      {blindIndex !== 2
                        ? <button className="skip-blind" onClick={skipBlind}>보상 포기하고 패스</button>
                        : <span>보스 블라인드는 패스할 수 없습니다</span>}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ) : (
      <div className="capture-layout">
        <aside className="status-rail panel">
          <div className="round-label">ANTE {game.round} · {currentBlind.english}</div>
          <div className="goal-score">
            <span>현재 점수</span>
            <strong className={game.lastCapturedIds.length ? 'score-pop' : ''} key={score.total}>{score.total}</strong>
            <i>/ {game.goRequiredScore}점</i>
          </div>
          <div className="progress-track"><div style={{ width: `${Math.min(100, score.total / game.goRequiredScore * 100)}%` }} /></div>
          <div className="turn-info"><span>진행 턴</span><strong>{Math.min(turn, 10)} / 10</strong></div>

          <section className="rail-won-pile">
            <span className="eyebrow">획득패</span>
            <div className="won-groups">
              {capturedGroups.map((group) => {
                const cards = categoryCards(game.captured, group.key)
                const visibleCards = cards.slice(-4)
                const hiddenCount = cards.length - visibleCards.length
                return <div className={`won-group ${visibleCards.some((card) => game.lastCapturedIds.includes(card.id)) ? 'just-scored' : ''}`} key={group.key}><span>{group.label} · {cards.length}장</span><div>{visibleCards.map((card, index) => <Card card={card} compact flyToScore={game.lastCapturedIds.includes(card.id)} effectIndex={index} effectDelayMs={getCaptureEffectDelay(card)} key={card.id} />)}{hiddenCount > 0 && <em className="won-more">+{hiddenCount}</em>}{!cards.length && <i>아직 없음</i>}</div><b>{group.score}점</b></div>
              })}
            </div>
          </section>

          <div className="coin-box"><span>보유 엽전</span><strong>{game.coins}냥</strong></div>
          <div className="charms-row status-charms">
            <span className="slot-title">부적</span>
            {game.ownedCharms.map((id) => {
              const charm = charms.find((item) => item.id === id)!
              return <div className="mini-charm" key={id} title={`${charm.name} · ${charm.description}`} style={{ '--accent': charm.accent } as React.CSSProperties}><b>{charm.icon}</b><span>{charm.name}</span></div>
            })}
            {Array.from({ length: Math.max(0, 5 - game.ownedCharms.length) }).map((_, index) => <div className="empty-slot" key={index}>+</div>)}
          </div>
        </aside>

        <section className="capture-board">
          <div className="table-zone">
            <div className="floor-spread">
              <div className="center-deck" aria-label={`뒤집지 않은 패 ${game.deck.length}장`}>
                <div className="deck-stack"><i>{game.deck.length}</i><span>남은 패</span></div>
              </div>
              {isResolving && capturedRevealedCards.map((card) => {
                const position = getFloorPosition(card.month - 1, 12)
                const revealIndex = game.lastRevealed.indexOf(card.id)
                return (
                  <div
                    className="loose-card dealt-from-deck"
                    key={`revealed-flight-${card.id}`}
                    style={{
                      '--floor-x': `${position.x}%`,
                      '--floor-y': `${position.y}%`,
                      '--stack-x': '0px',
                      '--stack-y': '0px',
                      '--scatter-shift': '0px',
                      '--scatter-rotate': '0deg',
                      '--deal-delay': `${360 + revealIndex * 900}ms`,
                    } as React.CSSProperties}
                  >
                    <Card card={card} compact />
                  </div>
                )
              })}
              {isResolving && matchedTargetCards.map((card, index) => {
                const position = getFloorPosition(card.month - 1, 12)
                const matchingRevealIndex = capturedRevealedCards.findIndex((revealed) => revealed.month === card.month)
                return (
                  <div
                    className="match-target-ghost"
                    key={`matched-floor-${card.id}`}
                    style={{
                      '--match-x': `${position.x}%`,
                      '--match-y': `${position.y}%`,
                      '--ghost-x': `${index * 8}px`,
                      '--ghost-duration': `${matchingRevealIndex >= 0 ? 1200 + matchingRevealIndex * 900 : 580}ms`,
                    } as React.CSSProperties}
                  >
                    <Card card={card} compact />
                  </div>
                )
              })}
              {floorGroups.map((group) => {
                const position = getFloorPosition(group.month - 1, 12)
                return group.cards.map((card, stackIndex) => (
                <div
                  className={`loose-card ${isResolving && game.lastPlayedId === card.id ? 'submitted-floor-placeholder' : ''} ${game.lastRevealed.includes(card.id) ? 'dealt-from-deck' : ''} ${group.cards.length > 1 ? 'same-month-stack' : ''} ${group.cards.length === 3 ? 'almost-set' : ''} ${selectedMonth === card.month ? 'can-capture' : ''}`}
                  key={card.id}
                  style={{
                    '--floor-x': `${position.x}%`,
                    '--floor-y': `${position.y}%`,
                    '--stack-x': `${stackIndex * 9}px`,
                    '--stack-y': `${stackIndex * 4}px`,
                    '--stack-order': stackIndex + 1,
                    '--scatter-rotate': `${((group.month * 10 + stackIndex * 2) % 7) - 3}deg`,
                    '--scatter-shift': `${((group.month * 11) % 5) - 2}px`,
                    '--deal-delay': `${360 + Math.max(0, game.lastRevealed.indexOf(card.id)) * 900}ms`,
                  } as React.CSSProperties}
                >
                  <Card
                    card={card}
                    compact
                    revealed={game.lastRevealed.includes(card.id)}
                    effectIndex={Math.max(0, game.lastRevealed.indexOf(card.id))}
                    effectDelayMs={(game.lastCapturedIds.length ? 1120 : 360) + Math.max(0, game.lastRevealed.indexOf(card.id)) * 900}
                  />
                </div>
                ))
              })}
              {!game.table.length && <div className="empty-floor">가져간 패가 놓였던 자리입니다</div>}
            </div>
            {!!game.lastCapturedIds.length && (
              <div
                className="capture-impact"
                key={game.lastCapturedIds.join('-')}
                style={game.lastMatchTarget ? {
                  '--impact-x': `${game.lastMatchTarget.x}%`,
                  '--impact-y': `${game.lastMatchTarget.y}%`,
                } as React.CSSProperties : undefined}
              >
                <i></i><strong>획득!</strong>
              </div>
            )}
          </div>

          <section className="hand-zone">
            <div className="player-hand">
              {sortedHand.map((card) => <Card key={card.id} card={card} selected={game.selected === card.id} onClick={() => !isResolving && !game.awaitingGoStop && setGame((current) => ({ ...current, selected: current.selected === card.id ? null : card.id }))} />)}
            </div>
            <div className="hand-sort" aria-label="손패 정렬">
              <button className={handSort === 'month' ? 'active' : ''} aria-pressed={handSort === 'month'} onClick={() => setHandSort('month')}>월순</button>
              <button className={handSort === 'kind' ? 'active' : ''} aria-pressed={handSort === 'kind'} onClick={() => setHandSort('kind')}>종류순</button>
            </div>
            <button className="primary-action play-turn" disabled={!game.selected || game.phase !== 'playing' || isResolving || game.awaitingGoStop} onClick={playTurn}>
              패 놓고 차례 넘기기 <span>바닥패 +2장</span>
            </button>
          </section>

        </section>
        {isResolving && game.lastMatchTarget && submittedAnimationCard && (
          <div
            className="submitted-card-flight"
            style={{
              '--submit-x': `${submitFlight.fromX}px`,
              '--submit-y': `${submitFlight.fromY}px`,
              '--match-x': `${submitFlight.toX}px`,
              '--match-y': `${submitFlight.toY}px`,
            } as React.CSSProperties}
          >
            <Card card={submittedAnimationCard} />
          </div>
        )}
      </div>
      )}

      {game.awaitingGoStop && (
        <div className="overlay go-stop-overlay">
          <section className="go-stop-modal">
            <span className="eyebrow">목표 점수 달성</span>
            <h2>고 또는 스톱</h2>
            <p>현재 {score.total}점 · {game.goCount}고</p>
            <div className="go-stop-actions">
              <button className="go-button" onClick={chooseGo}>고<span>{2 + game.goCount}냥 획득 · 다음 {score.total + 1}점</span></button>
              <button className="stop-button" onClick={chooseStop}>스톱<span>블라인드 클리어</span></button>
            </div>
          </section>
        </div>
      )}

      {game.phase === 'shop' && (
        <div className="overlay"><section className="shop-modal">
          <div className="modal-heading"><div><span>{currentBlind.name} 클리어</span><h2>{game.target}점 달성!</h2><p>부적은 획득한 점수패의 계산법을 강화합니다.</p></div><strong>{game.coins}냥</strong></div>
          <div className="shop-grid">
            {charms.map((charm) => {
              const owned = game.ownedCharms.includes(charm.id)
              return <button key={charm.id} className="shop-charm" disabled={owned || game.coins < charm.price} onClick={() => buyCharm(charm.id)} style={{ '--accent': charm.accent } as React.CSSProperties}>
                <i>{charm.icon}</i><h3>{charm.name}</h3><p>{charm.description}</p><b>{owned ? '보유 중' : `${charm.price}냥`}</b>
              </button>
            })}
          </div>
          <button className="primary-action next-round" onClick={nextBlind}>
            {game.blindIndex === 2 ? '다음 앤티로' : '다음 블라인드로'}
            <span>선택 화면</span>
          </button>
        </section></div>
      )}

      {game.phase === 'gameover' && (
        <div className="overlay"><section className="result-modal">
          <span className="stamp">敗</span><p>{currentBlind.name} 실패</p><h2>앤티 {game.round} · {score.total}점</h2>
          <p>목표 {game.target}점까지 {game.target - score.total}점이 모자랐습니다.</p>
          <button className="primary-action" onClick={() => setGame(newGame())}>새 판 시작</button>
        </section></div>
      )}

      {showRules && (
        <div className="overlay" onClick={() => setShowRules(false)}><section className="rules-modal" onClick={(event) => event.stopPropagation()}>
          <button className="close" onClick={() => setShowRules(false)}>×</button>
          <span className="eyebrow">게임 방법</span><h2>같은 월을 맞춰 점수패 획득</h2>
          <ol className="how-to"><li>손패에서 한 장을 골라 바닥에 놓습니다.</li><li>바닥에 같은 월 패가 있으면 낸 패와 짝을 즉시 가져옵니다.</li><li>같은 월 바닥패가 두 장이면 가져갈 한 장을 직접 선택합니다.</li><li>차례를 넘기면 덱에서 두 장이 차례대로 펼쳐집니다.</li><li>쌍피는 피 2장으로 계산합니다.</li><li>따닥·쓸·뻑 먹기·폭탄은 보너스 피 1장, 흔들기는 보너스 1점입니다.</li><li>필요 점수 달성 후 스톱하면 클리어, 고하면 엽전을 받고 1점을 더 내야 합니다.</li><li>고 이후 추가 점수를 내지 못한 채 손패가 끝나면 게임오버입니다.</li></ol>
          <div className="rules-grid">
            {[['오광 / 사광 / 삼광', '광 5 / 4 / 3장'], ['고도리', '2·4·8월 새 열끗 · 5점'], ['홍단', '1·2·3월 홍단 · 3점'], ['청단', '6·9·10월 청단 · 3점'], ['초단', '4·5·7월 초단 · 3점'], ['열끗', '5장부터 1점'], ['띠', '5장부터 1점'], ['피', '쌍피 포함 10장부터 1점']].map(([name, rule]) => <div key={name}><strong>{name}</strong><span>{rule}</span></div>)}
          </div>
        </section></div>
      )}

      {matchChoice && (() => {
        const played = game.hand.find((card) => card.id === matchChoice.playedId)
        const candidates = game.table.filter((card) => matchChoice.matchIds.includes(card.id))
        if (!played) return null
        return (
          <div className="match-choice-backdrop">
            <section className="match-choice-panel">
              <span className="eyebrow">같은 월 두 장</span>
              <h2>{played.month}월 패를 선택하세요</h2>
              <p>낸 패와 함께 가져올 바닥패 한 장을 고르세요.</p>
              <div className="match-choice-cards">
                {candidates.map((card) => (
                  <button key={card.id} onClick={() => resolveTurn(card.id)}>
                    <Card card={card} />
                  </button>
                ))}
              </div>
              <button className="cancel-choice" onClick={() => setMatchChoice(null)}>다시 생각하기</button>
            </section>
          </div>
        )
      })()}
    </main>
  )
}

export default App
