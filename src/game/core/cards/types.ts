export type CardKind = 'gwang' | 'animal' | 'ribbon-red' | 'ribbon-blue' | 'ribbon-plain' | 'pi'

export interface CardDefinition {
  id: string
  month: number
  spriteRow: number
  spriteColumn: number
  flower: string
  symbol: string
  kind: CardKind
  title: string
  chips: number
  bird?: boolean
  piValue?: number
}

export interface HwatuCard extends CardDefinition {
  instanceId: string
  bonusEvent?: string
  /** @deprecated UI 호환용. 새 로직에서는 instanceId를 사용합니다. */
  id: string
  definitionId: string
}
