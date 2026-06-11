// ROW_STARTS[r] = 0-indexed offset of first field in row r
// Row r has (r+1) fields, starts at field r*(r+1)/2 + 1
const ROW_STARTS = [0, 1, 3, 6, 10, 15, 21] as const

export function fieldToCoord(field: number): { row: number; col: number } {
  const idx = field - 1
  let row = 0
  while (row < 6 && ROW_STARTS[row + 1] <= idx) row++
  return { row, col: idx - ROW_STARTS[row] }
}

export function coordToField(row: number, col: number): number | null {
  if (row < 0 || row > 6) return null
  if (col < 0 || col > row) return null
  return ROW_STARTS[row] + col + 1
}

export function getNeighbors(field: number): number[] {
  const { row, col } = fieldToCoord(field)
  const candidates: [number, number][] = [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col - 1],
    [row - 1, col],
    [row + 1, col],
    [row + 1, col + 1],
  ]
  return candidates
    .map(([r, c]) => coordToField(r, c))
    .filter((f): f is number => f !== null)
}
