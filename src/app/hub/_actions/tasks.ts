"use server"

import { revalidatePath } from "next/cache"
import { requireOfficeUser } from "@/lib/hub/session"
import {
  completeTask, createTask, deleteTask, reopenTask, toggleChecklistItem,
} from "@/lib/hub/tasks"
import type { TaskPriority, TaskRecurrence } from "@/lib/hub/types"

interface Result {
  ok: boolean
  error?: string
}

export async function createTaskAction(input: {
  title: string
  notes?: string
  dueAt?: string
  priority?: TaskPriority
  recurrence?: TaskRecurrence
  assigneeUserId?: string
  checklist?: string[]
}): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    if (!input.title.trim()) return { ok: false, error: "Give the task a name" }
    await createTask(
      user.carrierId,
      {
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        dueAt: input.dueAt || null,
        priority: input.priority ?? "normal",
        recurrence: input.recurrence ?? "none",
        assigneeUserId: input.assigneeUserId || null,
        checklist: (input.checklist ?? []).filter((l) => l.trim()).map((label) => ({ label: label.trim(), done: false })),
      },
      { id: user.id, name: user.name }
    )
    revalidatePath("/hub/tasks")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not create task" }
  }
}

export async function completeTaskAction(id: string): Promise<Result & { recurred?: boolean }> {
  try {
    const user = await requireOfficeUser()
    const { next } = await completeTask(user.carrierId, id, { id: user.id, name: user.name })
    revalidatePath("/hub/tasks")
    revalidatePath("/hub")
    return { ok: true, recurred: Boolean(next) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not complete task" }
  }
}

export async function reopenTaskAction(id: string): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    await reopenTask(user.carrierId, id)
    revalidatePath("/hub/tasks")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reopen task" }
  }
}

export async function toggleChecklistAction(id: string, index: number, done: boolean): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    await toggleChecklistItem(user.carrierId, id, index, done)
    revalidatePath("/hub/tasks")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not update checklist" }
  }
}

export async function deleteTaskAction(id: string): Promise<Result> {
  try {
    const user = await requireOfficeUser()
    await deleteTask(user.carrierId, id)
    revalidatePath("/hub/tasks")
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not delete task" }
  }
}
