import { describe, expect, it } from "vitest"
import { assignLanes, type LaneSpan } from "./planner-lanes"

// Inclusive-day-span overlap: two blocks collide if they share any day.
function overlaps(a: LaneSpan, b: LaneSpan): boolean {
  return a.start <= b.end && b.start <= a.end
}

describe("assignLanes", () => {
  it("puts a single block on lane 0", () => {
    expect(assignLanes([{ start: 0, end: 2 }])).toEqual([0])
  })

  it("reuses a lane when a gap separates the blocks", () => {
    // [0,1] then [3,4]: day 2 is free between them.
    expect(assignLanes([{ start: 0, end: 1 }, { start: 3, end: 4 }])).toEqual([0, 0])
  })

  it("reuses a lane for blocks that merely touch end-to-end (no shared day)", () => {
    // [0,1] then [2,3]: prev.end + 1 === next.start.
    expect(assignLanes([{ start: 0, end: 1 }, { start: 2, end: 3 }])).toEqual([0, 0])
  })

  it("splits blocks that share a single day into separate lanes", () => {
    // [0,2] then [2,3] both occupy day 2 — inclusive spans collide.
    expect(assignLanes([{ start: 0, end: 2 }, { start: 2, end: 3 }])).toEqual([0, 1])
  })

  it("stacks fully overlapping blocks onto rising lanes", () => {
    expect(
      assignLanes([
        { start: 0, end: 3 },
        { start: 1, end: 3 },
        { start: 2, end: 3 },
      ])
    ).toEqual([0, 1, 2])
  })

  it("first-fits: a later block reuses the lowest lane that has freed up", () => {
    // [0,1] and [0,2] must split; [2,3] fits back on lane 0 (freed after day 1).
    expect(
      assignLanes([
        { start: 0, end: 1 },
        { start: 0, end: 2 },
        { start: 2, end: 3 },
      ])
    ).toEqual([0, 1, 0])
  })

  it("returns an empty assignment for no blocks", () => {
    expect(assignLanes([])).toEqual([])
  })

  it("never places two overlapping blocks on the same lane, and uses the minimum lane count", () => {
    // Sorted by start (then end) as PlannerGrid feeds it. Peak concurrency is
    // 3 (days 2–3: [1,3], [2,5], [2,2]), so an optimal colouring uses 3 lanes.
    const blocks: LaneSpan[] = [
      { start: 0, end: 0 },
      { start: 1, end: 3 },
      { start: 2, end: 2 },
      { start: 2, end: 5 },
      { start: 4, end: 4 },
      { start: 6, end: 6 },
    ]
    const lanes = assignLanes(blocks)

    // Invariant: no collision within a lane.
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (lanes[i] === lanes[j]) {
          expect(overlaps(blocks[i], blocks[j])).toBe(false)
        }
      }
    }

    // Minimality: lane count equals peak concurrency (max clique on intervals).
    const peak = Math.max(
      ...Array.from({ length: 7 }, (_, day) =>
        blocks.filter((b) => b.start <= day && day <= b.end).length
      )
    )
    expect(Math.max(...lanes) + 1).toBe(peak)
  })
})
