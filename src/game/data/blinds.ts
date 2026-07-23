import { BlindIndex } from '../engine/types'

export const blindDefinitions = [
  { name: '스몰 블라인드', english: 'SMALL BLIND', icon: '小', targetBonus: 0, reward: 3, color: '#6db7dc' },
  { name: '빅 블라인드', english: 'BIG BLIND', icon: '大', targetBonus: 200, reward: 5, color: '#e3a94f' },
  { name: '보스 블라인드', english: 'BOSS BLIND', icon: '王', targetBonus: 400, reward: 8, color: '#df5544' },
] as const

export const getBlind = (ante: number, index: BlindIndex) => ({
  ...blindDefinitions[index],
  target: 300 + (ante - 1) * 200 + blindDefinitions[index].targetBonus,
})
