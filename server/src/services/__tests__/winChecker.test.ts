import { describe, it, expect } from 'vitest'
import { checkWin } from '../winChecker'

describe('checkWin — three-sides rule', () => {
  it('returns false for empty claimed', () => {
    expect(checkWin([])).toBe(false)
  })

  it('returns false for single field', () => {
    expect(checkWin([1])).toBe(false)  // apex touches left+right but not bottom
    expect(checkWin([22])).toBe(false) // touches left+bottom but not right
    expect(checkWin([28])).toBe(false) // touches right+bottom but not left
  })

  it('returns false when only two sides are connected', () => {
    // Left edge path without reaching right side
    expect(checkWin([2, 4, 7, 11, 16, 22])).toBe(false) // left+bottom, no right
  })

  it('returns false when three sides touched but disconnected', () => {
    // Field 1 (left+right) and field 23 (bottom) with no connecting path
    expect(checkWin([1, 23])).toBe(false)
  })

  it('returns true for left-edge path (includes apex = left+right)', () => {
    // Fields 1,2,4,7,11,16,22 — left edge column
    // Field 1 is in both LEFT_EDGE and RIGHT_EDGE
    // Field 22 is in both LEFT_EDGE and BOTTOM_ROW
    expect(checkWin([1, 2, 4, 7, 11, 16, 22])).toBe(true)
  })

  it('returns true for right-edge path', () => {
    // Fields 1,3,6,10,15,21,28 — right edge column
    // Field 1 is in both LEFT_EDGE and RIGHT_EDGE
    // Field 28 is in both RIGHT_EDGE and BOTTOM_ROW
    expect(checkWin([1, 3, 6, 10, 15, 21, 28])).toBe(true)
  })

  it('returns true for entire bottom row (22 is left, 28 is right)', () => {
    expect(checkWin([22, 23, 24, 25, 26, 27, 28])).toBe(true)
  })

  it('returns true when one component of many satisfies the condition', () => {
    const isolated = [5, 8, 9]
    const winning  = [1, 2, 4, 7, 11, 16, 22]
    expect(checkWin([...isolated, ...winning])).toBe(true)
  })

  it('returns false for full middle cluster with no edge contact', () => {
    expect(checkWin([5, 8, 9, 13, 14])).toBe(false)
  })

  it('returns true for interior diagonal path touching all three sides', () => {
    // path: 2(left)→5→9→14→20→27→28(right+bottom), all connected
    expect(checkWin([2, 5, 9, 14, 20, 27, 28])).toBe(true)
  })

  it('returns false for path with gap (not connected across all sides)', () => {
    // {2}: touches LEFT_EDGE only (not a neighbor of 7)
    // {7,11,16,22}: left edge chain, touches LEFT_EDGE + BOTTOM_ROW, not RIGHT_EDGE
    // {28}: touches RIGHT_EDGE + BOTTOM_ROW, not LEFT_EDGE
    // No single component touches all three sides
    expect(checkWin([2, 7, 11, 16, 22, 28])).toBe(false)
  })

  it('returns false for right-edge path without apex (no left contact)', () => {
    // right edge minus field 1: touches RIGHT_EDGE + BOTTOM_ROW but not LEFT_EDGE
    expect(checkWin([3, 6, 10, 15, 21, 28])).toBe(false)
  })
})
