import { describe, it, expect } from 'vitest'
import { checkWin } from '../winChecker'

describe('checkWin - player 1 (top to bottom)', () => {
  it('returns false when nothing claimed', () => {
    expect(checkWin([], 1)).toBe(false)
  })

  it('returns false when field 1 not claimed', () => {
    expect(checkWin([22, 23, 24, 25, 26, 27, 28], 1)).toBe(false)
  })

  it('returns false with path that does not reach bottom', () => {
    expect(checkWin([1, 2, 4], 1)).toBe(false)
  })

  it('returns true with direct left-edge path', () => {
    // 1 → 2 → 4 → 7 → 11 → 16 → 22
    expect(checkWin([1, 2, 4, 7, 11, 16, 22], 1)).toBe(true)
  })

  it('returns true with right-edge path', () => {
    // 1 → 3 → 6 → 10 → 15 → 21 → 28
    expect(checkWin([1, 3, 6, 10, 15, 21, 28], 1)).toBe(true)
  })

  it('returns true with zigzag path through middle', () => {
    // 1 → 2 → 5 → 9 → 13 → 18 → 25
    expect(checkWin([1, 2, 5, 9, 13, 18, 25], 1)).toBe(true)
  })

  it('returns false when path is broken', () => {
    // 1 → 2 → [gap] → 7 → 11 → 16 → 22
    expect(checkWin([1, 2, 7, 11, 16, 22], 1)).toBe(false)
  })
})

describe('checkWin - player 2 (left to right)', () => {
  it('returns false when nothing claimed', () => {
    expect(checkWin([], 2)).toBe(false)
  })

  it('returns false with only left edge fields', () => {
    expect(checkWin([2, 4, 7], 2)).toBe(false)
  })

  it('returns true with simple horizontal path via row 2', () => {
    // 2(left) → 5 → 6(right)
    expect(checkWin([2, 5, 6], 2)).toBe(true)
  })

  it('returns true using apex field 1 as bridge', () => {
    // 2(left) → 1(apex) → 3(right)
    expect(checkWin([1, 2, 3], 2)).toBe(true)
  })

  it('returns false with broken horizontal path', () => {
    // 2(left) → [gap] → 6(right)
    expect(checkWin([2, 6], 2)).toBe(false)
  })

  it('returns true with bottom-spanning path', () => {
    // 22(left) → 23 → 24 → 25 → 26 → 27 → 28(right)
    expect(checkWin([22, 23, 24, 25, 26, 27, 28], 2)).toBe(true)
  })
})
