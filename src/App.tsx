import { useEffect, useMemo, useState } from 'react'
import { CardKind, charms, createDeck, HwatuCard, kindLabel, scoreCaptured, shuffle } from './game'

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
  message: string
  lastRevealed: string[]
  lastCapturedMonths: number[]
  lastPlayedId: string | null
  lastSubmittedId: string | null
  lastCapturedIds: string[]
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
  message: '도전할 블라인드를 확인하세요.',
  lastRevealed: [],
  lastPlayedId: null,
  lastSubmittedId: null,
  lastCapturedIds: [],
})

const categoryCards = (cards: HwatuCard[], category: 'gwang' | 'animal' | 'ribbon' | 'pi') =>
  cards.filter((card) => category === 'ribbon' ? card.kind.startsWith('ribbon') : card.kind === category)

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
      title={card.title}
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
      <span className="kind">{kindLabel[card.kind]}</span>
    </Tag>
  )
}

function App() {
  const [game, setGame] = useState<GameState>(newGame)
  const [showRules, setShowRules] = useState(false)
  const [matchChoice, setMatchChoice] = useState<{ playedId: string; matchIds: string[] } | null>(null)
  const [handSort, setHandSort] = useState<HandSort>('month')
  const [isResolving, setIsResolving] = useState(false)
  const score = useMemo(() => scoreCaptured(game.captured, game.ownedCharms), [game.captured, game.ownedCharms])
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

  const resolveTurn = (pickedMatchId?: string) => {
    setMatchChoice(null)
    setIsResolving(true)
    window.setTimeout(() => setIsResolving(false), 1100)
    setGame((current) => {
      const played = current.hand.find((card) => card.id === current.selected)
      if (!played) return current

      const revealed = current.deck.slice(0, 2)
      const remainingHand = current.hand.filter((card) => card.id !== played.id)
      const playerMatch = matchPlayedCard(current.table, played, pickedMatchId)
      const afterCapture = captureCompleteMonths([...playerMatch.table, ...revealed])
      const newlyCaptured = [...playerMatch.captured, ...afterCapture.captured]
      const captured = [...current.captured, ...newlyCaptured]
      const nextScore = scoreCaptured(captured, current.ownedCharms)
      const cleared = nextScore.total >= current.target
      const failed = !cleared && remainingHand.length === 0
      const blind = getBlind(current.round, current.blindIndex)
      const clearedHistory = [...current.blindHistory]
      if (cleared) clearedHistory[current.blindIndex] = 'cleared'
      const resultMessages: string[] = []
      if (playerMatch.swept) resultMessages.push(`${played.month}월 네 장을 한꺼번에 가져왔습니다!`)
      else if (playerMatch.matched) resultMessages.push(`${played.month}월 짝을 맞춰 2장을 가져왔습니다.`)
      if (afterCapture.completeMonths.length) resultMessages.push(`${afterCapture.completeMonths.join('·')}월 네 장이 펼쳐져 모두 가져왔습니다!`)
      if (!resultMessages.length) resultMessages.push('맞는 월이 없습니다. 바닥에 패를 놓았습니다.')
      const capturedCopy = resultMessages.join(' ')

      return {
        ...current,
        hand: remainingHand,
        deck: current.deck.slice(2),
        table: afterCapture.table,
        captured,
        selected: null,
        phase: cleared ? 'shop' : failed ? 'gameover' : 'playing',
        coins: cleared ? current.coins + blind.reward + remainingHand.length : current.coins,
        blindHistory: cleared ? clearedHistory : current.blindHistory,
        message: cleared
          ? `${capturedCopy} 목표 ${current.target}점을 달성했습니다.`
          : failed ? `마지막 턴이 끝났습니다. ${capturedCopy}` : capturedCopy,
        lastRevealed: revealed.map((card) => card.id),
        lastCapturedMonths: Array.from(new Set([
          ...(playerMatch.matched ? [played.month] : []),
          ...afterCapture.completeMonths,
        ])),
        lastPlayedId: playerMatch.matched ? null : played.id,
        lastSubmittedId: played.id,
        lastCapturedIds: newlyCaptured.map((card) => card.id),
      }
    })
  }

  const playTurn = () => {
    if (!game.selected || game.phase !== 'playing') return
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
        message: `${blind.name} 시작. 손패 한 장을 골라 바닥에 놓으세요.`,
        lastRevealed: [],
        lastPlayedId: null,
        lastSubmittedId: null,
        lastCapturedIds: [],
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
      message: current.blindIndex === 2 ? '새 앤티가 열렸습니다.' : '다음 블라인드를 선택하세요.',
      lastRevealed: [],
      lastPlayedId: null,
      lastSubmittedId: null,
      lastCapturedIds: [],
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
          <div className="rail-game-header">
            <div className="rail-logo"><span>花</span><strong>화투록</strong></div>
            <button onClick={() => setShowRules(true)}>게임 방법</button>
          </div>
          <div className="round-label">ANTE {game.round} · {currentBlind.english}</div>
          <div className="goal-score">
            <span>현재 점수</span>
            <strong className={game.lastCapturedIds.length ? 'score-pop' : ''} key={score.total}>{score.total}</strong>
            <i>/ {game.target}점</i>
          </div>
          <div className="progress-track"><div style={{ width: `${Math.min(100, score.total / game.target * 100)}%` }} /></div>
          <div className="turn-info"><span>진행 턴</span><strong>{Math.min(turn, 10)} / 10</strong></div>

          <section className="score-breakdown">
            <span className="eyebrow">고스톱 점수</span>
            {capturedGroups.map((group) => (
              <div key={group.key}><span>{group.label}</span><b>{categoryCards(game.captured, group.key).length}장</b><strong>{group.score}점</strong></div>
            ))}
            {score.bonus > 0 && <div className="bonus-line"><span>부적</span><b></b><strong>+{score.bonus}점</strong></div>}
            {score.details.length > 0 && <ul>{score.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
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
              {floorGroups.map((group, groupIndex) => {
                const position = getFloorPosition(groupIndex, floorGroups.length)
                return group.cards.map((card, stackIndex) => (
                <div
                  className={`loose-card ${group.cards.length > 1 ? 'same-month-stack' : ''} ${group.cards.length === 3 ? 'almost-set' : ''} ${selectedMonth === card.month ? 'can-capture' : ''}`}
                  key={card.id}
                  style={{
                    '--floor-x': `${position.x}%`,
                    '--floor-y': `${position.y}%`,
                    '--stack-x': `${stackIndex * 9}px`,
                    '--stack-y': `${stackIndex * 4}px`,
                    '--stack-order': stackIndex + 1,
                    '--scatter-rotate': `${((groupIndex * 7 + card.month * 3 + stackIndex * 2) % 7) - 3}deg`,
                    '--scatter-shift': `${((groupIndex * 11) % 5) - 2}px`,
                  } as React.CSSProperties}
                >
                  <Card
                    card={card}
                    compact
                    revealed={game.lastRevealed.includes(card.id)}
                    slapped={game.lastPlayedId === card.id}
                    effectIndex={Math.max(0, game.lastRevealed.indexOf(card.id))}
                    effectDelayMs={(game.lastCapturedIds.length ? 780 : 360) + Math.max(0, game.lastRevealed.indexOf(card.id)) * 130}
                  />
                  {stackIndex === group.cards.length - 1 && <span>{card.month}월 · {group.cards.length}장</span>}
                </div>
                ))
              })}
              {!game.table.length && <div className="empty-floor">가져간 패가 놓였던 자리입니다</div>}
            </div>
            {!!game.lastCapturedIds.length && (
              <div className="capture-impact" key={game.lastCapturedIds.join('-')}>
                <i></i><strong>획득!</strong>
              </div>
            )}
          </div>

          <section className="hand-zone">
            <div className="player-hand">
              {sortedHand.map((card) => <Card key={card.id} card={card} selected={game.selected === card.id} onClick={() => !isResolving && setGame((current) => ({ ...current, selected: current.selected === card.id ? null : card.id }))} />)}
            </div>
            <div className="hand-sort" aria-label="손패 정렬">
              <button className={handSort === 'month' ? 'active' : ''} aria-pressed={handSort === 'month'} onClick={() => setHandSort('month')}>월순</button>
              <button className={handSort === 'kind' ? 'active' : ''} aria-pressed={handSort === 'kind'} onClick={() => setHandSort('kind')}>종류순</button>
            </div>
            <button className="primary-action play-turn" disabled={!game.selected || game.phase !== 'playing' || isResolving} onClick={playTurn}>
              패 놓고 차례 넘기기 <span>바닥패 +2장</span>
            </button>
          </section>

          <section className="won-pile">
            <div className="won-groups">
              {capturedGroups.map((group) => {
                const cards = categoryCards(game.captured, group.key)
                const visibleCards = cards.slice(-4)
                const hiddenCount = cards.length - visibleCards.length
                return <div className={`won-group ${visibleCards.some((card) => game.lastCapturedIds.includes(card.id)) ? 'just-scored' : ''}`} key={group.key}><span>{group.label} · {cards.length}장</span><div>{visibleCards.map((card, index) => <Card card={card} compact flyToScore={game.lastCapturedIds.includes(card.id)} submittedCapture={card.id === game.lastSubmittedId && game.lastCapturedIds.includes(card.id)} effectIndex={index} effectDelayMs={0} key={card.id} />)}{hiddenCount > 0 && <em className="won-more">+{hiddenCount}</em>}{!cards.length && <i>아직 없음</i>}</div><b>{group.score}점</b></div>
              })}
            </div>
          </section>
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
          <ol className="how-to"><li>손패에서 한 장을 골라 바닥에 놓습니다.</li><li>바닥에 같은 월 패가 있으면 낸 패와 짝을 즉시 가져옵니다.</li><li>같은 월 바닥패가 두 장이면 가져갈 한 장을 직접 선택합니다.</li><li>차례를 넘기면 덱에서 두 장이 바닥에 자동으로 펼쳐집니다.</li><li>같은 월 네 장이 바닥에 모이면 네 장 모두 가져옵니다.</li><li>10번의 차례 안에 광·열끗·띠·피 족보로 목표 점수를 만드세요.</li></ol>
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
                    <strong>{kindLabel[card.kind]}</strong>
                    <span>{card.title}</span>
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
