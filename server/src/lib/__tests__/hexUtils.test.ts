import { describe, it, expect } from 'vitest'
import { fieldToCoord, coordToField, getNeighbors } from '../hexUtils'

describe('fieldToCoord', () => {
  it('field 1 is row 0 col 0', () => {
    expect(fieldToCoord(1)).toEqual({ row: 0, col: 0 })
  })
  it('field 2 is row 1 col 0', () => {
    expect(fieldToCoord(2)).toEqual({ row: 1, col: 0 })
  })
  it('field 3 is row 1 col 1', () => {
    expect(fieldToCoord(3)).toEqual({ row: 1, col: 1 })
  })
  it('field 13 is row 4 col 2', () => {
    expect(fieldToCoord(13)).toEqual({ row: 4, col: 2 })
  })
  it('field 28 is row 6 col 6', () => {
    expect(fieldToCoord(28)).toEqual({ row: 6, col: 6 })
  })
})

describe('coordToField', () => {
  it('row 0 col 0 is field 1', () => {
    expect(coordToField(0, 0)).toBe(1)
  })
  it('row 6 col 0 is field 22', () => {
    expect(coordToField(6, 0)).toBe(22)
  })
  it('invalid row returns null', () => {
    expect(coordToField(-1, 0)).toBeNull()
    expect(coordToField(7, 0)).toBeNull()
  })
  it('invalid col returns null', () => {
    expect(coordToField(3, 4)).toBeNull()
    expect(coordToField(3, -1)).toBeNull()
  })
})

describe('getNeighbors', () => {
  it('field 1 (apex) has neighbors 2 and 3', () => {
    expect(getNeighbors(1).sort()).toEqual([2, 3])
  })
  it('field 5 (row2 col1) has 6 neighbors', () => {
    // same row: 4, 6; above: 2, 3; below: 8, 9
    expect(getNeighbors(5).sort((a, b) => a - b)).toEqual([2, 3, 4, 6, 8, 9])
  })
  it('field 22 (bottom-left corner) has neighbors 16 and 23', () => {
    expect(getNeighbors(22).sort((a, b) => a - b)).toEqual([16, 23])
  })
})
