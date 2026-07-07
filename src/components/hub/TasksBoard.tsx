"use client"

/**
 * "My day" task board (E4). Sticky-note replacement: quick add at the top,
 * overdue screams, recurring chores roll themselves forward, automation
 * tasks deep-link straight to the record needing action.
 */
import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight, Check, ChevronDown, ChevronUp, Loader2, Plus, Repeat, Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  completeTaskAction, createTaskAction, deleteTaskAction, toggleChecklistAction,
} from "@/app/hub/_actions/tasks"
import { fieldCls } from "@/components/hub/ui"
import type { Task, TaskPriority, TaskRecurrence } from "@/lib/hub/types"

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "border-bad-soft bg-bad-soft text-bad",
  high: "border-warn-soft bg-warn-soft text-warn",
  normal: "border-border-strong bg-surface-2 text-fg-3",
  low: "border-border bg-surface-2 text-fg-3",
}

function taskHref(task: Task): string | null {
  if (!task.entity_type || !task.entity_id) return null
  const map: Record<string, string> = {
    load: `/hub/loads/${task.entity_id}`,
    customer: `/hub/customers/${task.entity_id}`,
    driver: `/hub/drivers/${task.entity_id}`,
    truck: `/hub/fleet/trucks/${task.entity_id}`,
    trailer: `/hub/fleet/trailers/${task.entity_id}`,
    incident: `/hub/safety/${task.entity_id}`,
    claim: "/hub/safety",
    applicant: "/hub/recruiting",
    fuel: "/hub/fuel",
    compliance: "/hub/compliance",
    invoice: "/hub/money",
  }
  return map[task.entity_type] ?? null
}

export function QuickAddTask() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    title: "",
    dueAt: "",
    priority: "normal" as TaskPriority,
    recurrence: "none" as TaskRecurrence,
    checklist: "",
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await createTaskAction({
        title: form.title,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        priority: form.priority,
        recurrence: form.recurrence,
        checklist: form.checklist.split("\n").filter((l) => l.trim()),
      })
      if (result.ok) {
        toast.success(form.recurrence !== "none" ? "Recurring task created — it rolls itself forward" : "Task added")
        setForm({ title: "", dueAt: "", priority: "normal", recurrence: "none", checklist: "" })
        setExpanded(false)
        router.refresh()
      } else toast.error(result.error ?? "Could not add")
    })
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface-2 p-3 space-y-2">
      <div className="flex gap-2">
        <input
          aria-label="New task"
          placeholder="Add a task… (e.g. Call Pacific Crest about THD-1008)"
          className={fieldCls}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <button
          type="button"
          aria-label={expanded ? "Fewer options" : "More options"}
          onClick={() => setExpanded((v) => !v)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-strong text-fg-2 hover:bg-hover"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          type="submit"
          disabled={pending || !form.title.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </button>
      </div>
      {expanded ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            aria-label="Due" type="datetime-local" className={fieldCls}
            value={form.dueAt}
            onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
          />
          <select
            aria-label="Priority" className={fieldCls} value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
          >
            <option value="low">Low priority</option>
            <option value="normal">Normal priority</option>
            <option value="high">High priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            aria-label="Repeats" className={fieldCls} value={form.recurrence}
            onChange={(e) => setForm({ ...form, recurrence: e.target.value as TaskRecurrence })}
          >
            <option value="none">Doesn&apos;t repeat</option>
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
          <textarea
            aria-label="Checklist (one item per line)"
            placeholder={"Checklist — one item per line (optional)\nCheck voicemail\nReview overnight statuses"}
            rows={3}
            className={`${fieldCls} sm:col-span-3`}
            value={form.checklist}
            onChange={(e) => setForm({ ...form, checklist: e.target.value })}
          />
        </div>
      ) : null}
    </form>
  )
}

export function TaskItem({ task }: { task: Task }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showChecklist, setShowChecklist] = useState(
    (task.checklist ?? []).length > 0 && (task.checklist ?? []).some((c) => !c.done)
  )
  const href = taskHref(task)
  const overdue = task.due_at && !task.completed_at && new Date(task.due_at) < new Date()
  const checklist = Array.isArray(task.checklist) ? task.checklist : []
  const doneCount = checklist.filter((c) => c.done).length

  const complete = () =>
    startTransition(async () => {
      const result = await completeTaskAction(task.id)
      if (result.ok) {
        toast.success(result.recurred ? "Done — next one is already on the list" : "Done")
        router.refresh()
      } else toast.error(result.error ?? "Could not complete")
    })

  const remove = () =>
    startTransition(async () => {
      const result = await deleteTaskAction(task.id)
      if (result.ok) router.refresh()
      else toast.error(result.error ?? "Could not delete")
      setConfirmingDelete(false)
    })

  const toggleItem = (index: number, done: boolean) =>
    startTransition(async () => {
      const result = await toggleChecklistAction(task.id, index, done)
      if (result.ok) router.refresh()
      else toast.error(result.error ?? "Could not update")
    })

  return (
    <div className={cn("rounded-xl border p-3", overdue ? "border-bad-soft bg-bad-soft" : "border-border bg-surface-2")}>
      <div className="flex items-start gap-3">
        <button
          onClick={complete}
          disabled={pending}
          aria-label="Mark done"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-strong text-transparent hover:border-accent hover:text-accent-text disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-accent-text" /> : <Check className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-fg">{task.title}</p>
            {task.recurrence !== "none" ? <Repeat className="h-3.5 w-3.5 text-fg-3" /> : null}
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", PRIORITY_STYLES[task.priority])}>
              {task.priority}
            </span>
            {task.automation_key ? (
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fg-3">
                auto
              </span>
            ) : null}
          </div>
          {task.notes ? <p className="mt-0.5 text-body-xs text-fg-3">{task.notes}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-fg-3">
            {task.due_at ? (
              <span className={cn(overdue && "font-bold text-bad")}>
                {overdue ? "Overdue — " : "Due "}
                {new Date(task.due_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            ) : null}
            {checklist.length > 0 ? (
              <button onClick={() => setShowChecklist((v) => !v)} className="font-semibold text-fg-3 hover:text-fg">
                Checklist {doneCount}/{checklist.length} {showChecklist ? "▾" : "▸"}
              </button>
            ) : null}
            {href ? (
              <Link href={href} className="inline-flex items-center gap-1 font-semibold text-accent-text hover:underline">
                Open the record <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
          {showChecklist && checklist.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {checklist.map((item, i) => (
                <li key={i}>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => toggleItem(i, e.target.checked)}
                      className="h-4 w-4 rounded border-border-strong accent-accent"
                    />
                    <span className={cn("text-sm", item.done ? "text-fg-3 line-through" : "text-fg-2")}>
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {confirmingDelete ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              onClick={remove}
              disabled={pending}
              aria-label="Confirm delete task"
              className="flex h-8 items-center gap-1 rounded-lg bg-bad px-2 text-[11px] font-bold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
              aria-label="Keep task"
              className="flex h-8 items-center rounded-lg px-2 text-[11px] font-semibold text-fg-3 hover:bg-hover"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            aria-label="Delete task"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-3 hover:bg-hover hover:text-bad"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
