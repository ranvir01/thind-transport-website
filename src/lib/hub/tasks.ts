/**
 * Tasks & office workflow (E4) — replaces the sticky notes.
 * Recurrence: completing a recurring task spawns the next occurrence.
 * Automations: system events create tasks with an automation_key so the same
 * problem never piles up duplicates; each task deep-links to its record.
 */
import { query, queryOne } from "./db"
import type { Task, TaskChecklistItem, TaskPriority, TaskRecurrence } from "./types"

// ---- Pure recurrence math (unit-tested) ----

/**
 * Next due date after completing a recurring task. Date-only semantics with
 * the time-of-day preserved; weekdays skip Sat/Sun; monthly clamps to the
 * shorter month's last day.
 */
export function nextOccurrence(due: Date, recurrence: TaskRecurrence): Date | null {
  if (recurrence === "none") return null
  const next = new Date(due.getTime())
  if (recurrence === "daily") {
    next.setDate(next.getDate() + 1)
  } else if (recurrence === "weekdays") {
    do {
      next.setDate(next.getDate() + 1)
    } while (next.getDay() === 0 || next.getDay() === 6)
  } else if (recurrence === "weekly") {
    next.setDate(next.getDate() + 7)
  } else if (recurrence === "monthly") {
    const day = next.getDate()
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    next.setDate(Math.min(day, lastDay))
  }
  return next
}

// ---- CRUD ----

const TASK_SELECT = `
  SELECT t.*, u.name AS assignee_name
  FROM hub.tasks t
  LEFT JOIN hub.users u ON u.id = t.assignee_user_id AND u.carrier_id = t.carrier_id`

export interface TaskFilters {
  assigneeUserId?: string
  open?: boolean
  limit?: number
}

export async function listTasks(carrierId: string, filters: TaskFilters = {}): Promise<Task[]> {
  const params: unknown[] = [carrierId]
  let where = `t.carrier_id = $1`
  if (filters.assigneeUserId) {
    params.push(filters.assigneeUserId)
    where += ` AND (t.assignee_user_id = $${params.length} OR t.assignee_user_id IS NULL)`
  }
  if (filters.open !== false) where += ` AND t.completed_at IS NULL`
  return query<Task>(
    `${TASK_SELECT} WHERE ${where}
     ORDER BY t.due_at ASC NULLS LAST, t.priority DESC, t.created_at
     LIMIT ${Math.min(filters.limit ?? 200, 500)}`,
    params
  )
}

export async function recentCompletedTasks(carrierId: string, limit = 20): Promise<Task[]> {
  return query<Task>(
    `${TASK_SELECT} WHERE t.carrier_id = $1 AND t.completed_at IS NOT NULL
     ORDER BY t.completed_at DESC LIMIT $2`,
    [carrierId, limit]
  )
}

export interface TaskInput {
  title: string
  notes?: string | null
  assigneeUserId?: string | null
  dueAt?: string | null
  priority?: TaskPriority
  entityType?: string | null
  entityId?: string | null
  checklist?: TaskChecklistItem[]
  recurrence?: TaskRecurrence
  automationKey?: string | null
}

export async function createTask(
  carrierId: string,
  input: TaskInput,
  creator: { id: string; name: string } | null
): Promise<Task | null> {
  const rows = await query<Task>(
    `INSERT INTO hub.tasks (carrier_id, title, notes, assignee_user_id, created_by, created_by_name,
       due_at, priority, entity_type, entity_id, checklist, recurrence, automation_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (carrier_id, automation_key) WHERE automation_key IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      carrierId, input.title, input.notes ?? null, input.assigneeUserId ?? null,
      creator?.id ?? null, creator?.name ?? "Automation",
      input.dueAt ?? null, input.priority ?? "normal",
      input.entityType ?? null, input.entityId ?? null,
      JSON.stringify(input.checklist ?? []), input.recurrence ?? "none",
      input.automationKey ?? null,
    ]
  )
  return rows[0] ?? null
}

/** Complete a task; recurring tasks immediately spawn their next occurrence. */
export async function completeTask(
  carrierId: string,
  id: string,
  actor: { id: string; name: string }
): Promise<{ next: Task | null }> {
  const task = await queryOne<Task>(
    `UPDATE hub.tasks SET completed_at = NOW(), completed_by_name = $3, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2 AND completed_at IS NULL RETURNING *`,
    [carrierId, id, actor.name]
  )
  if (!task || task.recurrence === "none") return { next: null }

  const baseDue = task.due_at ? new Date(task.due_at) : new Date()
  const nextDue = nextOccurrence(baseDue, task.recurrence)
  if (!nextDue) return { next: null }
  // Never schedule into the past — roll forward until it's ahead of now.
  let due = nextDue
  let guard = 0
  while (due.getTime() < Date.now() && guard < 400) {
    const rolled = nextOccurrence(due, task.recurrence)
    if (!rolled) break
    due = rolled
    guard++
  }
  const checklist = (Array.isArray(task.checklist) ? task.checklist : []).map((item) => ({
    label: item.label,
    done: false,
  }))
  const next = await createTask(
    carrierId,
    {
      title: task.title,
      notes: task.notes,
      assigneeUserId: task.assignee_user_id,
      dueAt: due.toISOString(),
      priority: task.priority,
      entityType: task.entity_type,
      entityId: task.entity_id,
      checklist,
      recurrence: task.recurrence,
    },
    { id: actor.id, name: task.created_by_name ?? actor.name }
  )
  return { next }
}

export async function reopenTask(carrierId: string, id: string): Promise<void> {
  await query(
    `UPDATE hub.tasks SET completed_at = NULL, completed_by_name = NULL, updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id]
  )
}

export async function toggleChecklistItem(
  carrierId: string,
  id: string,
  index: number,
  done: boolean
): Promise<void> {
  await query(
    `UPDATE hub.tasks
     SET checklist = jsonb_set(checklist, ARRAY[$3::text, 'done'], to_jsonb($4::boolean)),
         updated_at = NOW()
     WHERE carrier_id = $1 AND id = $2`,
    [carrierId, id, String(index), done]
  )
}

export async function deleteTask(carrierId: string, id: string): Promise<void> {
  await query(`DELETE FROM hub.tasks WHERE carrier_id = $1 AND id = $2`, [carrierId, id])
}

// ---- Automations (cron) ----

/**
 * The automation sweep (daily cron): every condition that needs office action
 * becomes a deep-linked task, deduped by automation_key. Returns created count.
 */
export async function runTaskAutomations(carrierId: string): Promise<{ created: number }> {
  let created = 0
  const add = async (input: TaskInput) => {
    const task = await createTask(carrierId, input, null)
    if (task) created++
  }
  // pg returns DATE columns as Date objects — normalize for keys and copy.
  const isoDate = (value: string | Date) => new Date(value).toISOString().slice(0, 10)

  // 1. Compliance items expired or expiring within 7 days.
  const compliance = await query<{ id: string; kind: string; due_on: string; entity_type: string; entity_id: string | null }>(
    `SELECT id, kind, due_on, entity_type, entity_id FROM hub.compliance_items
     WHERE carrier_id = $1 AND status = 'open' AND due_on IS NOT NULL AND due_on <= CURRENT_DATE + 7`,
    [carrierId]
  )
  for (const item of compliance) {
    const overdue = new Date(item.due_on) < new Date()
    await add({
      title: `${overdue ? "EXPIRED" : "Expiring"}: ${item.kind}`,
      notes: `Due ${isoDate(item.due_on)} — handle the renewal and mark the compliance item done.`,
      dueAt: new Date(item.due_on).toISOString(),
      priority: overdue ? "urgent" : "high",
      entityType: "compliance",
      entityId: item.id,
      automationKey: `compliance:${item.id}`,
    })
  }

  // 2. Driver CDL / med-card windows (7 days) without an open task.
  const drivers = await query<{ id: string; name: string; cdl_expiry: string | null; medical_card_expiry: string | null }>(
    `SELECT id, first_name || ' ' || last_name AS name, cdl_expiry, medical_card_expiry
     FROM hub.drivers WHERE carrier_id = $1 AND deleted_at IS NULL AND status = 'active'
       AND (cdl_expiry <= CURRENT_DATE + 7 OR medical_card_expiry <= CURRENT_DATE + 7)`,
    [carrierId]
  )
  const soon = new Date(Date.now() + 7 * 86400000)
  for (const driver of drivers) {
    // Both documents can be expiring in the same window — flag each one
    // that's actually due, not just whichever the ternary picked first.
    const windows: { label: string; date: string }[] = []
    if (driver.cdl_expiry && new Date(driver.cdl_expiry) <= soon) {
      windows.push({ label: "CDL", date: driver.cdl_expiry })
    }
    if (driver.medical_card_expiry && new Date(driver.medical_card_expiry) <= soon) {
      windows.push({ label: "medical card", date: driver.medical_card_expiry })
    }
    for (const what of windows) {
      await add({
        title: `${driver.name}'s ${what.label} ${new Date(what.date) < new Date() ? "is EXPIRED" : "expires this week"}`,
        notes: "Driver is not dispatch-legal once it lapses. Get the renewal scheduled today.",
        dueAt: new Date(what.date).toISOString(),
        priority: "urgent",
        entityType: "driver",
        entityId: driver.id,
        automationKey: `driver-expiry:${driver.id}:${what.label}:${isoDate(what.date)}`,
      })
    }
  }

  // 3. Unmatched fuel rows (no truck) from the last 30 days.
  const unmatchedFuel = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM hub.fuel_transactions
     WHERE carrier_id = $1 AND truck_id IS NULL AND ts >= NOW() - INTERVAL '30 days'`,
    [carrierId]
  )
  if (Number(unmatchedFuel?.count ?? 0) > 0) {
    await add({
      title: `${unmatchedFuel!.count} fuel purchase(s) aren't matched to a truck`,
      notes: "Unmatched fuel skews IFTA and cost-per-mile. Match them on the Fuel screen.",
      priority: "high",
      entityType: "fuel",
      entityId: "review",
      automationKey: `fuel-unmatched:${new Date().toISOString().slice(0, 10)}`,
    })
  }

  // 4. Cargo-claim filing deadlines inside 30 days (Carmack: delivery + 9 months).
  const claims = await query<{ id: string; filing_deadline: string }>(
    `SELECT id, filing_deadline FROM hub.claims
     WHERE carrier_id = $1 AND status IN ('open','filed') AND filing_deadline IS NOT NULL
       AND filing_deadline <= CURRENT_DATE + 30`,
    [carrierId]
  )
  for (const claim of claims) {
    await add({
      title: "Cargo claim filing deadline approaching",
      notes: `File before ${isoDate(claim.filing_deadline)} or the claim is dead.`,
      dueAt: new Date(claim.filing_deadline).toISOString(),
      priority: "urgent",
      entityType: "claim",
      entityId: claim.id,
      automationKey: `claim-deadline:${claim.id}`,
    })
  }

  // 5. Delivered loads sitting unbilled for 3+ days.
  const unbilled = await query<{ id: string; reference: string }>(
    `SELECT l.id, l.reference FROM hub.loads l
     WHERE l.carrier_id = $1 AND l.deleted_at IS NULL AND l.status = 'pod_received'
       AND l.updated_at < NOW() - INTERVAL '3 days'
       AND NOT EXISTS (SELECT 1 FROM hub.invoices i WHERE i.load_id = l.id)`,
    [carrierId]
  )
  for (const load of unbilled) {
    await add({
      title: `${load.reference} has its POD but no invoice`,
      notes: "It's been 3+ days. One click on the load page sends the invoice.",
      priority: "high",
      entityType: "load",
      entityId: load.id,
      automationKey: `unbilled:${load.id}`,
    })
  }

  return { created }
}
