import { getNeighbors } from '../lib/hexUtils'

// Left edge: leftmost field of each row 1-6 (excluding apex 1)
export const LEFT_EDGE = new Set([2, 4, 7, 11, 16, 22])
// Right edge: rightmost field of each row 1-6 (excluding apex 1)
export const RIGHT_EDGE = new Set([3, 6, 10, 15, 21, 28])
// Bottom row
export const BOTTOM_ROW = new Set([22, 23, 24, 25, 26, 27, 28])

export function checkWin(claimed: number[], player: 1 | 2): boolean {
  const claimedSet = new Set(claimed)

  if (player === 1) {
    if (!claimedSet.has(1)) return false
    return bfs(1, (f) => BOTTOM_ROW.has(f), claimedSet)
  }

  // Player 2: connect left edge to right edge
  const starts = [...LEFT_EDGE].filter((f) => claimedSet.has(f))
  for (const start of starts) {
    if (bfs(start, (f) => RIGHT_EDGE.has(f), claimedSet)) return true
  }
  return false
}

function bfs(
  start: number,
  isTarget: (f: number) => boolean,
  claimed: Set<number>
): boolean {
  const visited = new Set([start])
  const queue = [start]
  while (queue.length > 0) {
    const curr = queue.shift()!
    if (isTarget(curr)) return true
    for (const neighbor of getNeighbors(curr)) {
      if (claimed.has(neighbor) && !visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }
  return false
}
