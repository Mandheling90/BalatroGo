import { useEffect, useMemo, useRef, useState } from 'react'
import { CardKind, charms, HwatuCard, scoreCaptured } from './game'
import { evaluatePatterns } from './scoring'
import { Card } from './components/game/HwatuCard'
import { MatchChoiceModal, RulesModal } from './components/game/GameModals'
import { blindDefinitions, getBlind } from './game/data/blinds'
import { getFloorPosition } from './game/engine/floor-layout'
import { getDeckMatchCandidates, resolveGameTurn } from './game/engine/resolve-turn'
import { resolveDeckTurn } from './game/engine/resolve-deck-turn'
import { createNewGame, dealRound } from './game/engine/setup'
import { buyShopCharm, leaveShop, rerollShop } from './game/engine/shop'
import type { BlindIndex, GameState } from './game/engine/types'
import { scorePlaybackConfig } from './game/scoring/score-config'
import type { ScoreEvent } from './game/scoring/types'

type HandSort = 'month' | 'kind'

const handKindOrder: Record<CardKind, number> = {
  gwang: 0,
  animal: 1,
  'ribbon-red': 2,
  'ribbon-blue': 2,
  'ribbon-plain': 2,
  pi: 3,
}

const categoryCards = (cards: HwatuCard[], category: 'gwang' | 'animal' | 'ribbon' | 'pi') =>
  cards.filter((card) => category === 'ribbon' ? card.kind.startsWith('ribbon') : card.kind === category)

function App() {
  const [game, setGame] = useState<GameState>(createNewGame)
  const [showRules, setShowRules] = useState(false)
  const [selectedCharmId, setSelectedCharmId] = useState<string | null>(null)
  const [matchChoice, setMatchChoice] = useState<{
    source: 'hand' | 'deck'
    playedId: string
    matchIds: string[]
    handMatchId?: string
    ready?: boolean
  } | null>(null)
  const [handSort, setHandSort] = useState<HandSort>('month')
  const [isResolving, setIsResolving] = useState(false)
  const [isScorePlaying, setIsScorePlaying] = useState(false)
  const [submitFlight, setSubmitFlight] = useState({ fromX: 0, fromY: 0, toX: 0, toY: 0 })
  const [activeScoreEvent, setActiveScoreEvent] = useState<ScoreEvent | null>(null)
  const [displayScore, setDisplayScore] = useState({ base: 0, mult: 1, xMult: 1, total: 0 })
  const queuedCardSelection = useRef<string | null>(null)
  const skipRevealedDealId = useRef<string | null>(null)
  const score = useMemo(
    () => scoreCaptured(game.captured, game.ownedCharms, game.ruleBonus, game.ruleDetails, game.goCount),
    [game.captured, game.ownedCharms, game.ruleBonus, game.ruleDetails, game.goCount],
  )
  const completedPatterns = useMemo(() => evaluatePatterns(game.captured).completedPatterns, [game.captured])
  const scoringCardEvents = game.lastScoreEvents.filter((event) => event.sourceType === 'card')
  const activeScoringCardIndex = activeScoreEvent?.sourceType === 'card'
    ? scoringCardEvents.findIndex((event) => event.id === activeScoreEvent.id)
    : -1
  const patternLabels = (ids: string[]) => completedPatterns
    .filter((pattern) => ids.includes(pattern.id))
    .map((pattern) => `${pattern.name} +${pattern.score}`)
  const currentBlind = getBlind(game.round, game.blindIndex)
  const selectedCharm = charms.find((charm) => charm.id === selectedCharmId)
  const selectedMonth = game.hand.find((card) => card.id === game.selected)?.month
  const turn = game.turnsUsed
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
    return matchingRevealIndex >= 0 ? 1200 + matchingRevealIndex * 900 : 1200
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
    if (!game.pendingPhase || isScorePlaying) return
    const timer = window.setTimeout(() => {
      setGame((current) => current.pendingPhase
        ? { ...current, phase: current.pendingPhase, pendingPhase: null }
        : current)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [game.pendingPhase, isScorePlaying])

  useEffect(() => {
    const events = game.lastScoreEvents
    if (!events.length) {
      setIsScorePlaying(false)
      setDisplayScore({ base: score.cardPoints + score.jokerPoints, mult: score.multiplier, xMult: score.finalMultiplier, total: score.total })
      return
    }
    setIsScorePlaying(true)
    const baseDelta = events.reduce((sum, event) => sum + (event.baseDelta ?? 0), 0)
    const multDelta = events.reduce((sum, event) => sum + (event.multDelta ?? 0), 0)
    const hasGoEvent = events.some((event) => event.sourceType === 'go')
    const goRatio = game.goCount > 0 ? (game.goCount + 1) / Math.max(1, game.goCount) : 1
    let staged = {
      base: score.cardPoints + score.jokerPoints - baseDelta,
      mult: score.multiplier - multDelta,
      xMult: hasGoEvent ? score.finalMultiplier / goRatio : score.finalMultiplier,
    }
    const startingTotal = staged.base * staged.mult * staged.xMult
    setDisplayScore({ ...staged, total: startingTotal })
    setActiveScoreEvent(null)
    const timers: number[] = []
    let elapsed = scorePlaybackConfig.startDelayMs
    events.forEach((event) => {
      elapsed += event.emphasis === 'normal' ? scorePlaybackConfig.eventDelayMs : scorePlaybackConfig.strongDelayMs
      timers.push(window.setTimeout(() => {
        staged = {
          base: staged.base + (event.baseDelta ?? 0),
          mult: staged.mult + (event.multDelta ?? 0),
          xMult: event.xMult ?? staged.xMult,
        }
        setActiveScoreEvent(event)
        if ('vibrate' in navigator) navigator.vibrate(event.emphasis === 'normal' ? 12 : [18, 24, 30])
        setDisplayScore((current) => ({ ...current, base: staged.base, mult: staged.mult, xMult: staged.xMult }))
      }, elapsed))
    })
    timers.push(window.setTimeout(() => {
      setActiveScoreEvent(null)
      const startedAt = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / scorePlaybackConfig.countUpMs)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayScore((current) => ({ ...current, total: Math.round(startingTotal + (score.total - startingTotal) * eased) }))
        if (progress < 1) timers.push(window.requestAnimationFrame(tick))
        else {
          setIsScorePlaying(false)
          setIsResolving(false)
        }
      }
      timers.push(window.requestAnimationFrame(tick))
    }, elapsed + scorePlaybackConfig.strongDelayMs))
    timers.push(window.setTimeout(() => {
      setActiveScoreEvent(null)
      setDisplayScore({
        base: score.cardPoints + score.jokerPoints,
        mult: score.multiplier,
        xMult: score.finalMultiplier,
        total: score.total,
      })
      setIsScorePlaying(false)
      setIsResolving(false)
    }, elapsed + scorePlaybackConfig.strongDelayMs + scorePlaybackConfig.countUpMs + 120))
    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer)
        window.cancelAnimationFrame(timer)
      })
      setIsScorePlaying(false)
    }
  }, [game.lastScoreEvents, game.goCount, score.cardPoints, score.finalMultiplier, score.jokerPoints, score.multiplier, score.total])

  useEffect(() => {
    if (isResolving || isScorePlaying || !queuedCardSelection.current) return
    const queuedId = queuedCardSelection.current
    setGame((current) => {
      if (current.phase !== 'playing' || !current.hand.some((card) => card.id === queuedId)) {
        queuedCardSelection.current = null
        return current
      }
      return current.selected === queuedId ? current : { ...current, selected: queuedId }
    })
  }, [isResolving, isScorePlaying])

  useEffect(() => {
    if (!isResolving || game.lastCapturedIds.length || game.lastScoreEvents.length) return
    const isDeckPlacement = game.lastTurnAction === 'deck'
    if (!isDeckPlacement && !game.lastSubmittedId) return
    const delay = isDeckPlacement ? 2150 : game.lastRuleEffect === 'peok' ? 1600 : 1250
    const timer = window.setTimeout(() => setIsResolving(false), delay)
    return () => window.clearTimeout(timer)
  }, [
    game.lastCapturedIds.length,
    game.lastRuleEffect,
    game.lastScoreEvents.length,
    game.lastSubmittedId,
    game.lastTurnAction,
    isResolving,
  ])

  const resolveTurn = (pickedMatchId?: string, pickedDeckMatchId?: string) => {
    const deckCandidates = getDeckMatchCandidates(game, pickedMatchId)
    if (!pickedDeckMatchId && deckCandidates.length === 2 && game.deck[0]) {
      const revealedId = game.deck[0].id
      setIsResolving(true)
      setMatchChoice({
        source: 'deck',
        playedId: revealedId,
        matchIds: deckCandidates.map((card) => card.id),
        handMatchId: pickedMatchId,
        ready: false,
      })
      window.setTimeout(() => {
        setMatchChoice((current) => current?.source === 'deck' && current.playedId === revealedId
          ? { ...current, ready: true }
          : current)
        setIsResolving(false)
      }, 1250)
      return
    }
    const floor = document.querySelector<HTMLElement>('.floor-spread')
    const selectedCard = document.querySelector<HTMLElement>('.player-hand .hwatu-card[aria-pressed="true"]')
    const previewPlayed = game.hand.find((card) => card.id === game.selected)
    const previewMatches = previewPlayed ? game.table.filter((card) => card.month === previewPlayed.month) : []
    const sameMonthHandCount = previewPlayed ? game.hand.filter((card) => card.month === previewPlayed.month).length : 0
    const willBomb = sameMonthHandCount === 3 && previewMatches.length === 1
    const willPeok = !!previewPlayed
      && !willBomb
      && previewMatches.length === 1
      && game.deck[0]?.month === previewPlayed.month
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
    queuedCardSelection.current = null
    setIsResolving(true)
    window.setTimeout(() => setIsResolving(false), willPeok ? 1600 : 2700)
    setGame((current) => resolveGameTurn(current, pickedMatchId, pickedDeckMatchId))
  }

  const playTurn = () => {
    if (!game.selected || game.phase !== 'playing' || game.awaitingGoStop || game.turnsUsed >= 10 || isResolving || isScorePlaying) return
    const played = game.hand.find((card) => card.id === game.selected)
    if (!played) return
    const matches = game.table.filter((card) => card.month === played.month)
    if (matches.length === 2) {
      setMatchChoice({ source: 'hand', playedId: played.id, matchIds: matches.map((card) => card.id) })
      return
    }
    resolveTurn()
  }

  const playDeckTurn = () => {
    if (game.phase !== 'playing' || game.awaitingGoStop || game.turnsUsed >= 10 || !game.deck.length || game.lastTurnAction === 'deck' || isResolving || isScorePlaying) return
    setMatchChoice(null)
    queuedCardSelection.current = null
    setIsResolving(true)
    // 두 번째 카드의 1.26초 지연 + 0.8초 배치 애니메이션이 끝난 직후 입력을 연다.
    window.setTimeout(() => setIsResolving(false), 2150)
    setGame(resolveDeckTurn)
  }

  const selectHandCard = (cardId: string) => {
    queuedCardSelection.current = cardId
    setGame((current) => current.hand.some((card) => card.id === cardId)
      ? { ...current, selected: cardId }
      : current)
  }

  const startBlind = () => {
    setMatchChoice(null)
    queuedCardSelection.current = null
    setGame((current) => {
      const blind = getBlind(current.round, current.blindIndex)
      return {
        ...current,
        ...dealRound(),
        target: blind.target,
        selected: null,
        phase: 'playing',
        pendingPhase: null,
        gameOverReason: null,
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
        lastScoreEvents: [],
        lastRuleEffect: null,
        turnsUsed: 0,
        lastTurnAction: null,
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
    setGame((current) => buyShopCharm(current, id))
  }

  const rerollCharms = () => setGame(rerollShop)

  const exitShop = () => setGame(leaveShop)

  const capturedGroups = [
    { key: 'gwang' as const, label: '광', score: score.gwang, patterns: patternLabels(['three-brights', 'rain-three-brights', 'four-brights', 'five-brights']) },
    { key: 'animal' as const, label: '열끗', score: score.animal, patterns: patternLabels(['godori']) },
    { key: 'ribbon' as const, label: '띠', score: score.ribbon, patterns: patternLabels(['hongdan', 'cheongdan', 'chodan']) },
    { key: 'pi' as const, label: '피', score: score.pi, patterns: [] },
  ]

  return (
    <main className={`game-shell capture-game ${isResolving ? 'is-resolving' : ''} ${isScorePlaying ? 'is-score-playing' : ''} ${activeScoreEvent?.emphasis === 'critical' || activeScoreEvent?.sourceType === 'yaku' ? 'score-shake' : ''}`}>
      <div className="rotate-device" aria-hidden="true">
        <div className="rotate-phone">↻</div>
        <strong>가로로 돌려주세요</strong>
        <span>화투록은 가로 화면에 맞춰져 있습니다.</span>
      </div>
      {activeScoreEvent?.sourceType === 'card' && (
        <div className="score-card-popup" role="status" aria-label={`${activeScoreEvent.label} 화점 획득`}>
          <span className="score-card-popup-title">획득 화점</span>
          <div className="score-card-popup-row">
            {scoringCardEvents.map((event, index) => {
              const card = game.captured.find((item) => item.id === event.sourceId)
              if (!card) return null
              const isActive = index === activeScoringCardIndex
              const isScored = index <= activeScoringCardIndex
              return (
                <div className={`score-card-item ${isActive ? 'is-active' : ''} ${isScored ? 'is-scored' : ''}`} key={event.id}>
                  <Card card={card} compact />
                  <strong>+{event.baseDelta ?? 0} 화점</strong>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {activeScoreEvent && activeScoreEvent.sourceType !== 'card' && (
        <div className={`score-event-pop score-event-${activeScoreEvent.sourceType} ${activeScoreEvent.emphasis}`} role="status">
          <strong>{activeScoreEvent.label}</strong>
          <span>
            {activeScoreEvent.baseDelta ? `화점 +${activeScoreEvent.baseDelta}` : ''}
            {activeScoreEvent.multDelta ? `배수 +${activeScoreEvent.multDelta}` : ''}
            {activeScoreEvent.xMult ? `×${activeScoreEvent.xMult}` : ''}
          </span>
        </div>
      )}
      {isResolving && game.lastRuleEffect === 'peok' && (
        <div className="peok-effect" role="status" aria-label="뻑 발생">
          <i />
          <strong>뻑!</strong>
        </div>
      )}
      {isResolving && game.lastRuleEffect === 'jjok' && (
        <div className="jjok-effect" role="status" aria-label="쪽 성공">
          <i />
          <strong>쪽!</strong>
          <small>보너스 피 +1</small>
        </div>
      )}
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
                  <div className="blind-title">
                    <div className="blind-token"><span>{definition.icon}</span></div>
                    <h3>{definition.name}</h3>
                  </div>
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
            <strong>{displayScore.total} / {game.target}</strong>
          </div>
          <div className="balatro-score-strip" aria-label="점수 계산">
            <span className={`chip-score ${activeScoreEvent?.baseDelta ? 'is-active' : ''}`}><i>화점</i><b key={activeScoreEvent?.baseDelta ? activeScoreEvent.id : 'base'}>{displayScore.base}</b></span>
            <em>×</em>
            <span className="mult-score"><i>배수</i><b>{displayScore.mult}</b></span>
          </div>
          <div className="progress-track"><div style={{ width: `${Math.min(100, displayScore.total / game.target * 100)}%` }} /></div>
          <div className="turn-info"><span>진행 턴</span><strong>{Math.min(turn, 10)} / 10</strong></div>

          <section className="rail-won-pile">
            <span className="eyebrow">획득패</span>
            <div className="won-groups">
              {capturedGroups.map((group) => {
                const cards = categoryCards(game.captured, group.key)
                const visibleCards = cards.slice(-4)
                const hiddenCount = cards.length - visibleCards.length
                return <div className={`won-group ${group.patterns.length ? 'has-pattern' : ''} ${visibleCards.some((card) => game.lastCapturedIds.includes(card.id)) ? 'just-scored' : ''}`} key={group.key}><span>{group.label} · {cards.length}장</span>{group.patterns.length > 0 && <small className="won-pattern">{group.patterns.join(' · ')}</small>}<div>{visibleCards.map((card, index) => <Card card={card} compact flyToScore={game.lastCapturedIds.includes(card.id)} effectIndex={index} effectDelayMs={getCaptureEffectDelay(card)} key={card.id} />)}{hiddenCount > 0 && <em className="won-more">+{hiddenCount}</em>}{!cards.length && <i>아직 없음</i>}</div><b>{group.score}점</b></div>
              })}
            </div>
          </section>

          <div className="coin-box"><span>보유 엽전</span><strong>{game.coins}냥</strong></div>
          <div className="charms-row status-charms">
            <span className="slot-title">부적</span>
            {game.ownedCharms.map((id) => {
              const charm = charms.find((item) => item.id === id)!
              return <button className={`mini-charm ${activeScoreEvent?.sourceType === 'joker' && activeScoreEvent.sourceId === id ? 'is-triggered' : ''}`} key={id} type="button" aria-label={`${charm.name} 설명 보기`} title={`${charm.name} · ${charm.description}`} onClick={() => setSelectedCharmId(id)} style={{ '--accent': charm.accent } as React.CSSProperties}><b>{charm.icon}</b><span>{charm.name}</span></button>
            })}
            {Array.from({ length: Math.max(0, 5 - game.ownedCharms.length) }).map((_, index) => <div className="empty-slot" key={index}>+</div>)}
          </div>
        </aside>

        <section className="capture-board">
          <div className="table-zone">
            <div className="floor-spread">
              <button
                className="center-deck"
                type="button"
                aria-label={`남은 패 ${game.deck.length}장. 클릭하면 한 턴을 사용해 두 장을 바닥에 놓습니다.`}
                disabled={game.phase !== 'playing' || game.awaitingGoStop || game.turnsUsed >= 10 || !game.deck.length || game.lastTurnAction === 'deck' || isResolving || isScorePlaying}
                onClick={playDeckTurn}
              >
                <div className="deck-stack"><i>{game.deck.length}</i><span>남은 패</span></div>
                <small className="deck-turn-hint">{game.lastTurnAction === 'deck' ? '카드를 내야 다시 사용 가능' : '턴을 소비해 카드 2장 놓기'}</small>
              </button>
              {matchChoice?.source === 'deck' && (() => {
                const previewCard = game.deck.find((card) => card.id === matchChoice.playedId)
                if (!previewCard) return null
                const position = getFloorPosition(previewCard.month - 1, 12)
                return <div
                  className="loose-card dealt-from-deck deck-choice-preview"
                  style={{
                    '--floor-x': `${position.x}%`,
                    '--floor-y': `${position.y}%`,
                    '--stack-x': `${matchChoice.matchIds.length * 9}px`,
                    '--stack-y': `${matchChoice.matchIds.length * 4}px`,
                    '--scatter-shift': '0px',
                    '--scatter-rotate': '0deg',
                    '--deal-delay': '360ms',
                  } as React.CSSProperties}
                >
                  <Card card={previewCard} compact />
                </div>
              })()}
              {isResolving && capturedRevealedCards.filter((card) => card.id !== skipRevealedDealId.current).map((card) => {
                const position = getFloorPosition(card.month - 1, 12)
                const revealIndex = game.lastRevealed.indexOf(card.id)
                const priorFloorCards = matchedTargetCards.filter((target) => target.month === card.month).length
                const submittedCardOffset = submittedAnimationCard?.month === card.month ? 1 : 0
                const stackIndex = priorFloorCards + submittedCardOffset
                return (
                  <div
                    className="loose-card dealt-from-deck captured-reveal-flight"
                    key={`revealed-flight-${card.id}`}
                    style={{
                      '--floor-x': `${position.x}%`,
                      '--floor-y': `${position.y}%`,
                      '--stack-x': `${stackIndex * 9}px`,
                      '--stack-y': `${stackIndex * 4}px`,
                      '--scatter-shift': '0px',
                      '--scatter-rotate': '0deg',
                      '--deal-delay': `${360 + revealIndex * 900}ms`,
                      '--capture-delay': `${1200 + revealIndex * 900}ms`,
                    } as React.CSSProperties}
                  >
                    <Card card={card} compact />
                  </div>
                )
              })}
              {isResolving && matchedTargetCards.map((card, index) => {
                const position = getFloorPosition(card.month - 1, 12)
                const matchingRevealIndex = capturedRevealedCards.findIndex((revealed) => revealed.month === card.month)
                const stackIndex = matchedTargetCards.slice(0, index).filter((target) => target.month === card.month).length
                return (
                  <div
                    className="match-target-ghost"
                    key={`matched-floor-${card.id}`}
                    style={{
                      '--match-x': `${position.x}%`,
                      '--match-y': `${position.y}%`,
                      '--ghost-x': `${stackIndex * 9}px`,
                      '--ghost-y': `${stackIndex * 4}px`,
                      '--ghost-duration': `${matchingRevealIndex >= 0 ? 1200 + matchingRevealIndex * 900 : 1200}ms`,
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
                  className={`loose-card ${isResolving && game.lastPlayedId === card.id ? 'submitted-floor-placeholder' : ''} ${game.lastRevealed.includes(card.id) && card.id !== skipRevealedDealId.current ? 'dealt-from-deck' : ''} ${group.cards.length > 1 ? 'same-month-stack' : ''} ${group.cards.length === 3 ? 'almost-set' : ''} ${selectedMonth === card.month ? 'can-capture' : ''}`}
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
              {sortedHand.map((card) => <Card key={card.id} card={card} selected={game.selected === card.id} onClick={() => !game.awaitingGoStop && selectHandCard(card.id)} />)}
            </div>
            <div className="hand-sort" aria-label="손패 정렬">
              <button className={handSort === 'month' ? 'active' : ''} aria-pressed={handSort === 'month'} onClick={() => setHandSort('month')}>월순</button>
              <button className={handSort === 'kind' ? 'active' : ''} aria-pressed={handSort === 'kind'} onClick={() => setHandSort('kind')}>종류순</button>
            </div>
            <button className="primary-action play-turn" disabled={!game.selected || game.phase !== 'playing' || isResolving || isScorePlaying || game.awaitingGoStop} onClick={playTurn}>
              카드 제출
            </button>
          </section>

        </section>
        {isResolving && game.lastMatchTarget && submittedAnimationCard && (
          <div
            className={`submitted-card-flight ${game.lastPlayedId ? '' : 'hold-for-capture'}`}
            style={{
              '--submit-x': `${submitFlight.fromX}px`,
              '--submit-y': `${submitFlight.fromY}px`,
              '--match-x': `${submitFlight.toX}px`,
              '--match-y': `${submitFlight.toY}px`,
              '--hold-x': `${matchedTargetCards.filter((card) => card.month === submittedAnimationCard.month).length * 9}px`,
              '--hold-y': `${matchedTargetCards.filter((card) => card.month === submittedAnimationCard.month).length * 4}px`,
            } as React.CSSProperties}
          >
            <Card card={submittedAnimationCard} />
          </div>
        )}
      </div>
      )}

      {game.phase === 'shop' && (
        <div className="overlay"><section className="shop-modal">
          <div className="modal-heading"><div><span>{currentBlind.name} 클리어</span><h2>부적 상점</h2><p>진열된 부적을 구매하거나 상품을 리롤할 수 있습니다.</p></div><strong>{game.coins}냥</strong></div>
          <div className="shop-grid">
            {game.shopOfferIds.map((id) => charms.find((charm) => charm.id === id)).filter((charm) => charm !== undefined).map((charm) => {
              const owned = game.ownedCharms.includes(charm.id)
              return <button key={charm.id} className="shop-charm" disabled={owned || game.coins < charm.price} onClick={() => buyCharm(charm.id)} style={{ '--accent': charm.accent } as React.CSSProperties}>
                <i>{charm.icon}</i><h3>{charm.name}</h3><p>{charm.description}</p><b>{owned ? '보유 중' : `${charm.price}냥`}</b>
              </button>
            })}
            {!game.shopOfferIds.length && <p className="shop-empty">구매할 수 있는 부적이 더 없습니다.</p>}
          </div>
          <div className="shop-actions">
            <button className="reroll-shop" disabled={game.coins < game.shopRerollCost || game.ownedCharms.length >= charms.length} onClick={rerollCharms}>리롤 · {game.shopRerollCost}냥</button>
            <button className="primary-action next-round" onClick={exitShop}>상점 나가기<span>블라인드 선택 화면</span></button>
          </div>
        </section></div>
      )}

      {game.phase === 'gameover' && (
        <div className="overlay"><section className="result-modal">
          <span className="stamp">敗</span><p>{currentBlind.name} 실패</p><h2>앤티 {game.round} · {score.total}점</h2>
          {game.gameOverReason && <div className="game-over-reason"><strong>게임오버 사유</strong><span>{game.gameOverReason}</span></div>}
          <p>목표 화점 {game.target}점까지 {Math.max(0, game.target - score.total)}점이 모자랐습니다.</p>
          <button className="primary-action" onClick={() => setGame(createNewGame())}>새 판 시작</button>
        </section></div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {selectedCharm && <div className="overlay charm-detail-overlay" onClick={() => setSelectedCharmId(null)}><section className="charm-detail-modal" onClick={(event) => event.stopPropagation()} style={{ '--accent': selectedCharm.accent } as React.CSSProperties}>
        <button className="close" type="button" aria-label="부적 설명 닫기" onClick={() => setSelectedCharmId(null)}>×</button>
        <span className="eyebrow">보유 부적</span>
        <i>{selectedCharm.icon}</i>
        <h2>{selectedCharm.name}</h2>
        <p>{selectedCharm.description}</p>
      </section></div>}

      {matchChoice?.ready !== false && matchChoice && (() => {
        const played = [...game.hand, ...game.deck].find((card) => card.id === matchChoice.playedId)
        const candidates = [...game.table, ...game.hand].filter((card) => matchChoice.matchIds.includes(card.id))
        if (!played) return null
        const chooseMatch = (cardId: string) => {
          if (matchChoice.source === 'deck') {
            skipRevealedDealId.current = matchChoice.playedId
            window.setTimeout(() => { skipRevealedDealId.current = null }, 2800)
            resolveTurn(matchChoice.handMatchId, cardId)
          } else {
            resolveTurn(cardId)
          }
        }
        const cancelChoice = () => {
          setMatchChoice(null)
          setIsResolving(false)
        }
        return <MatchChoiceModal played={played} candidates={candidates} onChoose={chooseMatch} onCancel={cancelChoice} />
      })()}
    </main>
  )
}

export default App
