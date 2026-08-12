import { describe, expect, it } from 'bun:test'
import { classifyBattleOutcome } from '../../resources/functions/territory-battle'

describe('territory battle outcomes', () => {
  it('contests an intersection that does not cut the polygon', () => {
    expect(classifyBattleOutcome(5000, [5000])).toBe('contested')
  })

  it('finishes a minimum-scale territory after a clean cut', () => {
    expect(classifyBattleOutcome(1900, [1200, 700])).toBe('takeover')
  })

  it('splits when both retained and captured pieces are valid', () => {
    expect(classifyBattleOutcome(6000, [4200, 1800])).toBe('split')
  })

  it('contests a sliver smaller than the minimum territory', () => {
    expect(classifyBattleOutcome(6000, [5300, 700])).toBe('contested')
  })
})
