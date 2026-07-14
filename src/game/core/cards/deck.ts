import { cardDefinitions } from './definitions'
import { HwatuCard } from './types'

export const createDeck = (): HwatuCard[] => cardDefinitions.map((definition) => {
  const instanceId = `${definition.month}-${definition.id}-${Math.random().toString(36).slice(2, 7)}`
  return { ...definition, instanceId, id: instanceId, definitionId: definition.id }
})

export const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}
