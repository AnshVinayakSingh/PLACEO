export type Trend = 'up' | 'down'

export type StatCard = {
  key: string
  label: string
  value: number
  suffix?: string
  icon: 'target' | 'flame' | 'mic' | 'clock'
  trend: Trend
  change: string
  accent: string
}

export const statCards: StatCard[] = [
  {
    key: 'readiness',
    label: 'Placement Readiness',
    value: 78,
    suffix: '%',
    icon: 'target',
    trend: 'up',
    change: '+6% this week',
    accent: 'oklch(0.62 0.2 265)',
  },
  {
    key: 'streak',
    label: 'Coding Streak',
    value: 24,
    suffix: ' days',
    icon: 'flame',
    trend: 'up',
    change: '+3 days',
    accent: 'oklch(0.7 0.19 35)',
  },
  {
    key: 'interview',
    label: 'Interview Score',
    value: 8.6,
    suffix: '/10',
    icon: 'mic',
    trend: 'up',
    change: '+0.4 pts',
    accent: 'oklch(0.65 0.24 300)',
  },
  {
    key: 'hours',
    label: 'Study Hours This Week',
    value: 27,
    suffix: 'h',
    icon: 'clock',
    trend: 'down',
    change: '-2h vs last',
    accent: 'oklch(0.75 0.15 220)',
  },
]

// 30 days of skill mastery progress
export const masteryData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const base = 42 + i * 1.15
  const wobble = Math.sin(i / 2.4) * 4 + Math.cos(i / 1.7) * 2.5
  const dsa = Math.min(96, Math.round(base + wobble))
  const problem = Math.min(94, Math.round(base - 6 + Math.sin(i / 3) * 5))
  return {
    day: `D${day}`,
    mastery: dsa,
    problems: Math.max(20, problem),
  }
})

export type Skill = { name: string; value: number }

export const skillHeatmap: Skill[] = [
  { name: 'DSA', value: 88 },
  { name: 'React', value: 82 },
  { name: 'DBMS', value: 74 },
  { name: 'Java', value: 69 },
  { name: 'OOPs', value: 91 },
  { name: 'Aptitude', value: 63 },
  { name: 'Communication', value: 77 },
]

export type Task = {
  id: string
  title: string
  due: string
  done: boolean
  tag: string
}

export const upcomingTasks: Task[] = [
  { id: 't1', title: 'Complete Dynamic Programming set', due: 'Today', done: false, tag: 'DSA' },
  { id: 't2', title: 'Mock interview — System Design', due: 'Tomorrow', done: false, tag: 'Interview' },
  { id: 't3', title: 'Revise React reconciliation notes', due: 'Wed', done: true, tag: 'React' },
  { id: 't4', title: 'Group discussion: AI & Jobs', due: 'Thu', done: false, tag: 'GD' },
  { id: 't5', title: 'Polish resume — projects section', due: 'Fri', done: false, tag: 'Resume' },
]

export type Leader = {
  rank: number
  name: string
  score: number
  avatar: string
}

export const leaderboard: Leader[] = [
  { rank: 1, name: 'Aarav Mehta', score: 9820, avatar: '/avatar-2.png' },
  { rank: 2, name: 'Priya Nair', score: 9410, avatar: '/avatar-1.png' },
  { rank: 3, name: 'Lin Zhao', score: 9105, avatar: '/avatar-3.png' },
  { rank: 4, name: 'Daniel Kim', score: 8730, avatar: '/avatar-4.png' },
  { rank: 5, name: 'You', score: 8460, avatar: '/avatar-1.png' },
]
