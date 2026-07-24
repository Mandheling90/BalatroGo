import { RuleModifier } from './types'

export const charmModifiers: RuleModifier[] = [
  { id: 'moon', name: '쌍월경', icon: '◑', description: '같은 월 4장을 완성해 획득할 때마다 +1 화점', price: 7, accent: '#ffe49a', priority: 100, modifyScore: ({ counts }) => ({ score: counts.completeMonthSets, detail: counts.completeMonthSets ? `쌍월경 ${counts.completeMonthSets} 화점` : undefined }) },
  { id: 'gwang', name: '광명부', icon: '光', description: '획득한 광 2장마다 보너스 1점', price: 8, accent: '#ffd15c', priority: 100, modifyScore: ({ counts }) => { const score = Math.floor(counts.gwang / 2); return { score, detail: score ? `광명부 ${score}점` : undefined } } },
  { id: 'pi', name: '피바람', icon: '血', description: '피 점수패 7장부터 1점 추가', price: 6, accent: '#ff6b57', priority: 100, modifyScore: ({ counts }) => ({ score: counts.junk >= 7 ? 1 : 0, detail: counts.junk >= 7 ? '피바람 1점' : undefined }) },
  { id: 'ribbon', name: '삼색 매듭', icon: '結', description: '띠 점수패 3장부터 1점 추가', price: 7, accent: '#61d8ff', priority: 100, modifyScore: ({ counts }) => ({ score: counts.ribbon >= 3 ? 1 : 0, detail: counts.ribbon >= 3 ? '삼색 매듭 1점' : undefined }) },
  { id: 'bird', name: '새벽의 새장', icon: '鳥', description: '획득한 새 두 마리마다 보너스 1점', price: 6, accent: '#b9f06a', priority: 100, modifyScore: ({ counts }) => { const score = Math.floor(counts.bird / 2); return { score, detail: score ? `새벽의 새장 ${score}점` : undefined } } },
  { id: 'flower-shoes', name: '꽃신', icon: '花', description: '처음 획득한 월마다 +5 화점', price: 6, accent: '#ff9fbd', priority: 110, modifyScore: ({ counts }) => { const score = counts.completedMonths * 5; return { score, detail: score ? `꽃신 ${score} 화점` : undefined } } },
  { id: 'bright-stone', name: '광채석', icon: '晶', description: '획득한 광마다 +15 화점', price: 8, accent: '#ffe36e', priority: 110, modifyScore: ({ counts }) => { const score = counts.gwang * 15; return { score, detail: score ? `광채석 ${score} 화점` : undefined } } },
  { id: 'pi-pouch', name: '피주머니', icon: '囊', description: '환산 피 1장마다 +3 화점', price: 5, accent: '#e86666', priority: 110, modifyScore: ({ counts }) => { const score = counts.junk * 3; return { score, detail: score ? `피주머니 ${score} 화점` : undefined } } },
  {
    id: 'sweep-fan', name: '싹쓸이 부채', icon: '扇', description: '한 턴에 카드 4장 이상 획득하면 +25 화점', price: 8, accent: '#72e2c0', priority: 120,
    modifySettlementScore: (current, previous) => {
      const previousIds = new Set(previous.cards.map((card) => card.id))
      const earnedCount = current.cards.filter((card) => !previousIds.has(card.id)).length
      return { score: earnedCount >= 4 ? 25 : 0, detail: earnedCount >= 4 ? '싹쓸이 부채 25 화점' : undefined }
    },
  },
  {
    id: 'moon-mirror', name: '월광 거울', icon: '鏡', description: '같은 월 4장을 한 턴에 획득할 때마다 +30 화점', price: 9, accent: '#9cbcff', priority: 120,
    modifySettlementScore: (current, previous) => {
      const previousIds = new Set(previous.cards.map((card) => card.id))
      const earnedByMonth = current.cards.filter((card) => !previousIds.has(card.id) && card.month >= 1)
        .reduce<Map<number, number>>((counts, card) => counts.set(card.month, (counts.get(card.month) ?? 0) + 1), new Map())
      const completedMonthCount = [...earnedByMonth.values()].filter((count) => count >= 4).length
      const score = completedMonthCount * 30
      return { score, detail: score ? `월광 거울 ${score} 화점` : undefined }
    },
  },
  {
    id: 'twin-flowers', name: '쌍화전', icon: '雙', description: '한 턴에 일반 화투패를 정확히 2장 획득하면 +15 화점', price: 7, accent: '#f1a6d5', priority: 120,
    modifySettlementScore: (current, previous) => {
      const previousIds = new Set(previous.cards.map((card) => card.id))
      const earnedRegularCards = current.cards.filter((card) =>
        !previousIds.has(card.id) && card.definitionId !== 'bonus-pi')
      return {
        score: earnedRegularCards.length === 2 ? 15 : 0,
        detail: earnedRegularCards.length === 2 ? '쌍화전 15 화점' : undefined,
      }
    },
  },
  {
    id: 'yaku-scroll', name: '족보첩', icon: '譜', description: '현재 족보 점수 3점마다 족보 배수 +1', price: 9, accent: '#ff8d78', priority: 130,
    modifyScore: ({ yakuScore }) => {
      const multDelta = Math.floor(yakuScore / 3)
      return { score: 0, multDelta, detail: multDelta ? `족보첩 배수 +${multDelta}` : undefined }
    },
  },
  {
    id: 'three-ribbon-seal', name: '삼단 인장', icon: '印', description: '홍단·청단·초단 하나마다 족보 배수 +2', price: 10, accent: '#ee6f62', priority: 130,
    modifyScore: ({ completedPatternIds }) => {
      const danCount = ['hongdan', 'cheongdan', 'chodan'].filter((id) => completedPatternIds.includes(id)).length
      const multDelta = danCount * 2
      return { score: 0, multDelta, detail: multDelta ? `삼단 인장 배수 +${multDelta}` : undefined }
    },
  },
  {
    id: 'yaku-bell', name: '신명 방울', icon: '鈴', description: '이번 턴 족보 총점이 증가하면 족보 배수 +2', price: 8, accent: '#ffad66', priority: 140,
    modifySettlementScore: (current, previous) => ({
      score: 0,
      multDelta: current.yakuScore > previous.yakuScore ? 2 : 0,
      detail: current.yakuScore > previous.yakuScore ? '신명 방울 배수 +2' : undefined,
    }),
  },
]

export const charms = charmModifiers.map(({ priority: _priority, modifyScore: _modifyScore, modifySettlementScore: _modifySettlementScore, ...charm }) => charm)
