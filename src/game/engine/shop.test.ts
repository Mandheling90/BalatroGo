import { describe, expect, it } from 'vitest'
import { createNewGame } from './setup'
import { buyShopCharm, createShopOffers, leaveShop, rerollShop } from './shop'

describe('charm shop', () => {
  it('offers exactly two unowned charms', () => {
    const offers = createShopOffers(['moon'], () => 0)
    expect(offers).toHaveLength(2)
    expect(new Set(offers).size).toBe(2)
    expect(offers).not.toContain('moon')
  })

  it('buys only a displayed charm and removes it from the shelf', () => {
    const state = { ...createNewGame(), coins: 20, phase: 'shop' as const, shopOfferIds: ['pi', 'bird'] }
    const purchased = buyShopCharm(state, 'pi')
    expect(purchased.ownedCharms).toContain('pi')
    expect(purchased.shopOfferIds).toEqual(['bird'])
    expect(purchased.coins).toBeLessThan(state.coins)
    expect(buyShopCharm(state, 'moon')).toBe(state)
  })

  it('charges an increasing reroll cost', () => {
    const state = { ...createNewGame(), coins: 10, phase: 'shop' as const, shopOfferIds: ['pi', 'bird'], shopRerollCost: 2 }
    const rerolled = rerollShop(state, () => 0)
    expect(rerolled.coins).toBe(8)
    expect(rerolled.shopRerollCost).toBe(3)
    expect(rerolled.shopOfferIds).toHaveLength(2)
  })

  it('returns to the next blind only when leaving the shop', () => {
    const state = { ...createNewGame(), phase: 'shop' as const, shopOfferIds: ['pi', 'bird'] }
    const next = leaveShop(state)
    expect(next.phase).toBe('blind')
    expect(next.blindIndex).toBe(1)
    expect(next.shopOfferIds).toEqual([])
  })
})
