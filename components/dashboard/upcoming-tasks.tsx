'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { upcomingTasks } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'

export function UpcomingTasks() {
  const [tasks, setTasks] = useState(upcomingTasks)

  function toggle(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }

  const remaining = tasks.filter((t) => !t.done).length

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="size-5 text-brand-blue" />
          <h3 className="font-display text-lg font-semibold">Upcoming Tasks</h3>
        </div>
        <span className="glass rounded-full px-2.5 py-1 text-xs text-muted-foreground">
          {remaining} left
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => toggle(task.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/50"
            >
              {task.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-brand-cyan" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-sm font-medium',
                    task.done && 'text-muted-foreground line-through',
                  )}
                >
                  {task.title}
                </span>
                <span className="text-xs text-muted-foreground">{task.tag}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  task.due === 'Today'
                    ? 'bg-brand-purple/20 text-brand-purple'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                {task.due}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
