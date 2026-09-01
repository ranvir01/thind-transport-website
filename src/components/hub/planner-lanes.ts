// Lane-packing for the week-grid planner. Lives outside PlannerGrid.tsx (which
// pulls in "use server" actions and can't be imported by a unit test) so the
// stacking math is testable in isolation — same reasoning as countdown.ts.

export interface LaneSpan {
  start: number
  end: number
}

/**
 * Greedy lane assignment so overlapping blocks stack instead of colliding.
 * Expects `blocks` pre-sorted by start (then end), the way PlannerGrid feeds
 * them; on that ordering first-fit is an optimal interval colouring (uses the
 * minimum number of lanes). Day spans are inclusive, so two blocks that share
 * any day land in separate lanes; blocks that merely touch end-to-end
 * (`prev.end + 1 === next.start`) reuse a lane.
 */
export function assignLanes(blocks: LaneSpan[]): number[] {
  const laneEnds: number[] = []
  return blocks.map((b) => {
    for (let lane = 0; lane < laneEnds.length; lane++) {
      if (laneEnds[lane] <= b.start) {
        laneEnds[lane] = b.end + 1
        return lane
      }
    }
    laneEnds.push(b.end + 1)
    return laneEnds.length - 1
  })
}
