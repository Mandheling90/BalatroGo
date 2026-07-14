export type PatternCategory = 'gwang' | 'ribbon' | 'animal' | 'junk' | 'special'

export interface PatternDefinition {
  id: string
  name: string
  category: PatternCategory
  requiredCardIds?: string[]
  forbiddenCardIds?: string[]
  minimumCount?: number
  baseScore: number
  scorePerExtraCard: number
  stackable: boolean
  exclusiveGroup?: string
  priority: number
  enabled: boolean
  description: string
}

export interface SpecialRuleDefinition {
  id: string
  name: string
  category: 'special'
  enabled: boolean
  multiplier?: number
  description: string
}

export interface ScoringOptions {
  includeRainRibbon: boolean
  useMayAnimalAsDoublePi: boolean
  useSeptemberAnimalAsDoublePi: boolean
  bonusCardPiValue: number
}

export const defaultScoringOptions: ScoringOptions = {
  includeRainRibbon: true,
  useMayAnimalAsDoublePi: false,
  useSeptemberAnimalAsDoublePi: false,
  bonusCardPiValue: 1,
}

export const patternDefinitions: PatternDefinition[] = [
  { id: 'three-brights', name: '삼광', category: 'gwang', minimumCount: 3, forbiddenCardIds: ['dec-rain-gwang'], baseScore: 3, scorePerExtraCard: 0, stackable: false, exclusiveGroup: 'bright-rank', priority: 10, enabled: true, description: '비광을 제외한 광 3장' },
  { id: 'rain-three-brights', name: '비삼광', category: 'gwang', requiredCardIds: ['dec-rain-gwang'], minimumCount: 3, baseScore: 2, scorePerExtraCard: 0, stackable: false, exclusiveGroup: 'bright-rank', priority: 9, enabled: true, description: '비광을 포함한 광 3장' },
  { id: 'four-brights', name: '사광', category: 'gwang', minimumCount: 4, baseScore: 4, scorePerExtraCard: 0, stackable: false, exclusiveGroup: 'bright-rank', priority: 20, enabled: true, description: '광 4장' },
  { id: 'five-brights', name: '오광', category: 'gwang', minimumCount: 5, baseScore: 15, scorePerExtraCard: 0, stackable: false, exclusiveGroup: 'bright-rank', priority: 30, enabled: true, description: '광 5장' },
  { id: 'hongdan', name: '홍단', category: 'ribbon', requiredCardIds: ['jan-red-ribbon', 'feb-red-ribbon', 'mar-red-ribbon'], baseScore: 3, scorePerExtraCard: 0, stackable: true, priority: 10, enabled: true, description: '1·2·3월 홍단띠' },
  { id: 'cheongdan', name: '청단', category: 'ribbon', requiredCardIds: ['jun-blue-ribbon', 'sep-blue-ribbon', 'oct-blue-ribbon'], baseScore: 3, scorePerExtraCard: 0, stackable: true, priority: 10, enabled: true, description: '6·9·10월 청단띠' },
  { id: 'chodan', name: '초단', category: 'ribbon', requiredCardIds: ['apr-plain-ribbon', 'may-plain-ribbon', 'jul-plain-ribbon'], baseScore: 3, scorePerExtraCard: 0, stackable: true, priority: 10, enabled: true, description: '4·5·7월 초단띠' },
  { id: 'ribbon-count', name: '띠', category: 'ribbon', minimumCount: 5, baseScore: 1, scorePerExtraCard: 1, stackable: true, priority: 1, enabled: true, description: '띠 5장부터 1점, 이후 장당 1점' },
  { id: 'godori', name: '고도리', category: 'animal', requiredCardIds: ['feb-bird', 'apr-bird', 'aug-bird'], baseScore: 5, scorePerExtraCard: 0, stackable: true, priority: 10, enabled: true, description: '2·4·8월 새 열끗' },
  { id: 'animal-count', name: '열끗', category: 'animal', minimumCount: 5, baseScore: 1, scorePerExtraCard: 1, stackable: true, priority: 1, enabled: true, description: '열끗 5장부터 1점, 이후 장당 1점' },
  { id: 'junk-count', name: '피', category: 'junk', minimumCount: 10, baseScore: 1, scorePerExtraCard: 1, stackable: true, priority: 1, enabled: true, description: '환산 피 10장부터 1점, 이후 장당 1점' },
]

export const specialRuleDefinitions: SpecialRuleDefinition[] = [
  { id: 'pi-bak', name: '피박', category: 'special', enabled: false, multiplier: 2, description: '상대 피 수에 따른 배수' },
  { id: 'gwang-bak', name: '광박', category: 'special', enabled: false, multiplier: 2, description: '상대가 광이 없을 때의 배수' },
  { id: 'meong-bak', name: '멍박', category: 'special', enabled: false, multiplier: 2, description: '열끗 장수에 따른 배수' },
  { id: 'go-bak', name: '고박', category: 'special', enabled: false, multiplier: 2, description: '고 선언자 패배 배수' },
  { id: 'shake', name: '흔들기', category: 'special', enabled: true, description: '같은 월 3장을 든 경우의 특수 규칙' },
  { id: 'bomb', name: '폭탄', category: 'special', enabled: true, description: '같은 월 손패 3장과 바닥패 1장 처리' },
  { id: 'go-multiplier', name: '고 배수', category: 'special', enabled: false, description: '고 횟수에 따른 점수 및 배수' },
]
