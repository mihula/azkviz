import { getNeighbors } from '../lib/hexUtils'

export const LEFT_EDGE  = new Set([1, 2, 4, 7, 11, 16, 22])
export const RIGHT_EDGE = new Set([1, 3, 6, 10, 15, 21, 28])
export const BOTTOM_ROW = new Set([22, 23, 24, 25, 26, 27, 28])

export function checkWin(claimed: number[]): boolean {
  const claimedSet = new Set(claimed)
  const visited = new Set<number>()

  for (const start of claimed) {
    if (visited.has(start)) continue

    // BFS — collect one connected component
    const component = new Set<number>()
    const queue = [start]
    while (queue.length > 0) {
      const curr = queue.shift()!
      if (component.has(curr)) continue
      component.add(curr)
      visited.add(curr)
      for (const nb of getNeighbors(curr)) {
        if (claimedSet.has(nb) && !component.has(nb)) queue.push(nb)
      }
    }

    // Win if this component touches all three sides
    const touchesLeft   = [...component].some(f => LEFT_EDGE.has(f))
    const touchesRight  = [...component].some(f => RIGHT_EDGE.has(f))
    const touchesBottom = [...component].some(f => BOTTOM_ROW.has(f))
    if (touchesLeft && touchesRight && touchesBottom) return true
  }

  return false
}
