import { requirePermissionPage } from "@/lib/hub/session"
import { listTasks, recentCompletedTasks } from "@/lib/hub/tasks"
import { PageHeader, EmptyState } from "@/components/hub/ui"
import { QuickAddTask, TaskItem } from "@/components/hub/TasksBoard"
import type { Task } from "@/lib/hub/types"

export const dynamic = "force-dynamic"

function bucketize(tasks: Task[]) {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const overdue: Task[] = []
  const today: Task[] = []
  const later: Task[] = []
  const someday: Task[] = []
  for (const task of tasks) {
    if (!task.due_at) someday.push(task)
    else if (new Date(task.due_at) < now) overdue.push(task)
    else if (new Date(task.due_at) <= endOfToday) today.push(task)
    else later.push(task)
  }
  return { overdue, today, later, someday }
}

const SECTIONS: { key: keyof ReturnType<typeof bucketize>; label: string; tone?: string }[] = [
  { key: "overdue", label: "Overdue", tone: "text-bad" },
  { key: "today", label: "Today" },
  { key: "later", label: "Coming up" },
  { key: "someday", label: "No date" },
]

export default async function TasksPage() {
  const user = await requirePermissionPage("tasks:read")
  const [open, completed] = await Promise.all([
    listTasks(user.carrierId),
    recentCompletedTasks(user.carrierId, 10),
  ])
  const buckets = bucketize(open)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Tasks"
        subtitle="The office's sticky notes, minus the sticky notes. Recurring chores roll themselves forward."
      />
      <div className="mb-4">
        <QuickAddTask />
      </div>

      {open.length === 0 ? (
        <EmptyState
          title="All clear"
          hint="Add your morning routine as a repeating checklist — automations will drop urgent items here on their own."
        />
      ) : (
        <div className="space-y-5">
          {SECTIONS.map(({ key, label, tone }) => {
            const items = buckets[key]
            if (items.length === 0) return null
            return (
              <section key={key}>
                <h2 className={`mb-2 font-display text-sm font-bold uppercase tracking-wider ${tone ?? "text-fg-3"}`}>
                  {label} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {completed.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-fg-3">
            Recently done
          </h2>
          <ul className="space-y-1">
            {completed.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
                <span className="text-fg-3 line-through truncate">{task.title}</span>
                <span className="shrink-0 text-[11px] text-fg-3">
                  {task.completed_by_name ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
