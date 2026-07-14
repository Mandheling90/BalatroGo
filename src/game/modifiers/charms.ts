import { RuleModifier } from './types'

export const charmModifiers: RuleModifier[] = [
  { id: 'moon', name: '쌍월경', icon: '◑', description: '완성해 가져온 달마다 보너스 1점', price: 7, accent: '#ffe49a', priority: 100, modifyScore: ({ counts }) => ({ score: counts.completedMonths, detail: counts.completedMonths ? `쌍월경 ${counts.completedMonths}점` : undefined }) },
  { id: 'gwang', name: '광명부', icon: '光', description: '획득한 광 2장마다 보너스 1점', price: 8, accent: '#ffd15c', priority: 100, modifyScore: ({ counts }) => { const score = Math.floor(counts.gwang / 2); return { score, detail: score ? `광명부 ${score}점` : undefined } } },
  { id: 'pi', name: '피바람', icon: '血', description: '피 점수패 7장부터 1점 추가', price: 6, accent: '#ff6b57', priority: 100, modifyScore: ({ counts }) => ({ score: counts.junk >= 7 ? 1 : 0, detail: counts.junk >= 7 ? '피바람 1점' : undefined }) },
  { id: 'ribbon', name: '삼색 매듭', icon: '結', description: '띠 점수패 3장부터 1점 추가', price: 7, accent: '#61d8ff', priority: 100, modifyScore: ({ counts }) => ({ score: counts.ribbon >= 3 ? 1 : 0, detail: counts.ribbon >= 3 ? '삼색 매듭 1점' : undefined }) },
  { id: 'bird', name: '새벽의 새장', icon: '鳥', description: '획득한 새 두 마리마다 보너스 1점', price: 6, accent: '#b9f06a', priority: 100, modifyScore: ({ counts }) => { const score = Math.floor(counts.bird / 2); return { score, detail: score ? `새벽의 새장 ${score}점` : undefined } } },
]

export const charms = charmModifiers.map(({ priority: _priority, modifyScore: _modifyScore, ...charm }) => charm)
