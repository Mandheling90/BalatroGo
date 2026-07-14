import { HwatuCard } from './types'

export function createBonusPi(event: string, index: number): HwatuCard {
  const instanceId = `bonus-pi-${event}-${Date.now()}-${index}`
  return {
    id: instanceId, instanceId, definitionId: 'bonus-pi', month: 0, spriteRow: 0, spriteColumn: 2,
    flower: '보너스', symbol: '피', kind: 'pi', title: `${event} 보너스 피`, chips: 2, piValue: 1,
  }
}
