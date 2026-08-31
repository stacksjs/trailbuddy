import { describe, expect, it } from 'bun:test'
import {
  diffTerritories,
  formatTerritoryArea,
  OWN_TERRITORY_COLOR,
  territoryAppearance,
  territoryColor,
  type TerritorySnapshot,
} from '../../resources/functions/territory-style'

/**
 * The map used to draw two colours — yours and everyone else's — which says
 * nothing on a map with six rivals, and rebuilt every polygon on every pan.
 * These cover the two things that fixes: colour has to be stable enough to
 * carry identity, and a pan has to change only what changed.
 */

describe('territory colours', () => {
  it('always gives the viewer their own colour', () => {
    expect(territoryColor(7, 7)).toBe(OWN_TERRITORY_COLOR)
  })

  it('gives the same athlete the same colour every time', () => {
    // Colour is identity here. An athlete whose colour changed between pans
    // would read as a different athlete.
    expect(territoryColor(42, 1)).toBe(territoryColor(42, 1))
  })

  it('does not depend on who is looking', () => {
    // Two players discussing the map have to be seeing the same thing.
    expect(territoryColor(42, 1)).toBe(territoryColor(42, 2))
  })

  it('tells neighbouring rivals apart', () => {
    const colors = new Set([1, 2, 3, 4, 5, 6].map(id => territoryColor(id, 99)))
    // Not a guarantee of uniqueness across all ids, but six adjacent athletes
    // must not collapse into one colour.
    expect(colors.size).toBeGreaterThanOrEqual(5)
  })

  it('never gives a rival the viewer\'s colour', () => {
    for (let id = 1; id <= 200; id++) {
      if (id === 99)
        continue
      expect(territoryColor(id, 99)).not.toBe(OWN_TERRITORY_COLOR)
    }
  })

  it('copes with a missing viewer', () => {
    expect(territoryColor(5, null)).not.toBe(OWN_TERRITORY_COLOR)
    expect(territoryColor(5, undefined)).not.toBe(OWN_TERRITORY_COLOR)
  })
})

describe('territory appearance', () => {
  it('draws the viewer’s own ground more strongly', () => {
    // "Mine" and "theirs" have to separate before any colour is decoded.
    const mine = territoryAppearance(1, 1, 'active')
    const theirs = territoryAppearance(2, 1, 'active')

    expect(mine.fillOpacity).toBeGreaterThan(theirs.fillOpacity)
    expect(mine.weight).toBeGreaterThan(theirs.weight)
  })

  it('dashes contested ground without changing whose it is', () => {
    const contested = territoryAppearance(2, 1, 'contested')
    const active = territoryAppearance(2, 1, 'active')

    expect(contested.dashArray).toBeDefined()
    expect(active.dashArray).toBeUndefined()
    expect(contested.color).toBe(active.color)
  })

  it('keeps fills light enough to see the map through', () => {
    expect(territoryAppearance(1, 1, 'active').fillOpacity).toBeLessThan(0.5)
  })
})

describe('diffTerritories', () => {
  const snapshot = (id: number, overrides: Partial<TerritorySnapshot> = {}): TerritorySnapshot => ({
    id,
    userId: 1,
    status: 'active',
    shapeVersion: '10',
    ...overrides,
  })

  it('reports nothing when nothing moved', () => {
    // The common case on a pan: the same territories come back, and redrawing
    // them would drop any open popup for no reason.
    const previous = new Map([[1, snapshot(1)], [2, snapshot(2)]])
    const result = diffTerritories(previous, [snapshot(1), snapshot(2)])

    expect(result.added).toEqual([])
    expect(result.changed).toEqual([])
    expect(result.removed).toEqual([])
  })

  it('finds a territory that has come into view', () => {
    const result = diffTerritories(new Map([[1, snapshot(1)]]), [snapshot(1), snapshot(2)])
    expect(result.added.map(t => t.id)).toEqual([2])
  })

  it('finds one that has gone out of view', () => {
    const previous = new Map([[1, snapshot(1)], [2, snapshot(2)]])
    expect(diffTerritories(previous, [snapshot(1)]).removed).toEqual([2])
  })

  it('notices a territory changing hands', () => {
    const previous = new Map([[1, snapshot(1, { userId: 1 })]])
    const result = diffTerritories(previous, [snapshot(1, { userId: 2 })])
    expect(result.changed.map(t => t.id)).toEqual([1])
  })

  it('notices a territory being cut down', () => {
    const previous = new Map([[1, snapshot(1, { shapeVersion: '10' })]])
    const result = diffTerritories(previous, [snapshot(1, { shapeVersion: '14' })])
    expect(result.changed.map(t => t.id)).toEqual([1])
  })

  it('notices it becoming contested', () => {
    const previous = new Map([[1, snapshot(1, { status: 'active' })]])
    const result = diffTerritories(previous, [snapshot(1, { status: 'contested' })])
    expect(result.changed.map(t => t.id)).toEqual([1])
  })

  it('starts from nothing', () => {
    const result = diffTerritories(new Map(), [snapshot(1), snapshot(2)])
    expect(result.added.length).toBe(2)
    expect(result.removed).toEqual([])
  })
})

describe('area formatting', () => {
  it('picks the unit for the magnitude', () => {
    // A territory game spans four orders of it, and "0.004 km²" tells a player
    // nothing they can feel.
    expect(formatTerritoryArea(450)).toBe('450 m²')
    expect(formatTerritoryArea(25000)).toBe('2.50 ha')
    expect(formatTerritoryArea(4500000)).toBe('4.50 km²')
  })

  it('clamps a negative rather than showing one', () => {
    expect(formatTerritoryArea(-10)).toBe('0 m²')
  })
})
