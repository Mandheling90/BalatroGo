import type { HwatuCard } from '../../game/core/cards/types'
import { getGoAdditiveMultiplier, getGoFinalMultiplier } from '../../game/scoring/score-config'
import { Card } from './HwatuCard'

export function GoStopModal({ score, goCount, onGo, onStop }: {
  score: number
  goCount: number
  onGo: () => void
  onStop: () => void
}) {
  const nextGoCount = goCount + 1
  const goAdditiveMultiplier = getGoAdditiveMultiplier(nextGoCount)
  const goEffectLabel = goAdditiveMultiplier > 0
    ? `족보 배수 +${goAdditiveMultiplier}`
    : `최종 화점 ×${getGoFinalMultiplier(nextGoCount)}`

  return <div className="overlay go-stop-overlay"><section className="go-stop-modal">
    <span className="eyebrow">족보 점수 진전</span>
    <h2>고 · 스톱</h2>
    <p>현재 족보 {score}점 · {goCount}고</p>
    <div className="go-risk-warning"><strong>주의</strong> 고를 선택한 뒤 족보 총점이 오르지 않은 채 판을 더 진행할 수 없으면, 그 턴의 화점은 0점 처리됩니다.</div>
    <div className="go-stop-actions">
      <button className="go-button" onClick={onGo}>고<span>{nextGoCount}고 · 성공 정산 {goEffectLabel} · 족보 진전 필요</span></button>
      <button className="stop-button" onClick={onStop}>스톱<span>0고 · ×1 상태로 다음 턴</span></button>
    </div>
  </section></div>
}

export function GoFailureModal({ onConfirm }: { onConfirm: () => void }) {
  return <div className="overlay go-stop-overlay"><section className="go-stop-modal go-failure-modal">
    <span className="eyebrow">고 실패</span>
    <h2>획득 실패</h2>
    <p>이번 턴에 획득한 패가 없어 고에 실패했습니다.</p>
    <div className="go-risk-warning"><strong>결과</strong> 이번 턴 화점은 0점이며, 고 횟수와 고 진행 상태가 초기화되었습니다.</div>
    <div className="go-stop-actions stop-only">
      <button className="stop-button" onClick={onConfirm}>확인<span>다음 턴 계속하기</span></button>
    </div>
  </section></div>
}

export function MatchChoiceModal({ played, candidates, onChoose, onCancel }: {
  played: HwatuCard
  candidates: HwatuCard[]
  onChoose: (cardId: string) => void
  onCancel: () => void
}) {
  return <div className="match-choice-backdrop"><section className="match-choice-panel">
    <span className="eyebrow">같은 월 두 장</span>
    <h2>{played.month}월 패를 선택하세요</h2>
    <p>낸 패와 함께 가져올 바닥패 한 장을 고르세요.</p>
    <div className="match-choice-cards">
      {candidates.map((card) => <button key={card.id} onClick={() => onChoose(card.id)}><Card card={card} /></button>)}
    </div>
    <button className="cancel-choice" onClick={onCancel}>다시 생각하기</button>
  </section></div>
}

export function RulesModal({ onClose }: { onClose: () => void }) {
  const patterns = [
    ['오광 / 사광 / 삼광', '광 5 / 4 / 3장'], ['고도리', '2·4·8월 새 열끗 · 5점'],
    ['홍단', '1·2·3월 홍단 · 3점'], ['청단', '6·9·10월 청단 · 3점'],
    ['초단', '4·5·7월 초단 · 3점'], ['열끗', '5장부터 1점'],
    ['띠', '5장부터 1점'], ['피', '쌍피 포함 10장부터 1점'],
  ]

  return <div className="overlay" onClick={onClose}><section className="rules-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose}>×</button>
    <span className="eyebrow">게임 방법</span><h2>같은 월을 맞춰 점수패 획득</h2>
    <ol className="how-to"><li>손패에서 한 장을 골라 바닥에 놓습니다.</li><li>바닥에 같은 월 패가 있으면 낸 패와 짝을 즉시 가져옵니다.</li><li>같은 월 바닥패가 두 장이면 가져갈 한 장을 직접 선택합니다.</li><li>차례를 넘기면 덱에서 두 장이 차례대로 펼쳐집니다.</li><li>쌍피는 피 2장으로 계산합니다.</li><li>따닥·쓸·뻑 먹기·폭탄은 보너스 피 1장, 흔들기는 보너스 1점입니다.</li><li>필요 점수 달성 후 스톱하면 클리어, 고하면 엽전을 받고 1점을 더 내야 합니다.</li><li>고 이후 바로 다음 턴에 추가 점수를 내지 못하면, 낸 패와 뒷패 처리가 끝난 뒤 게임오버입니다.</li></ol>
    <div className="rules-grid">{patterns.map(([name, rule]) => <div key={name}><strong>{name}</strong><span>{rule}</span></div>)}</div>
  </section></div>
}
