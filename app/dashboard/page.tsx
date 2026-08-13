import type { Metadata } from 'next'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const metadata: Metadata = {
  title: 'Dashboard — PLACEO',
  description:
    'Track your placement readiness, skill mastery, coding streak, and interview performance on your PLACEO AI career dashboard.',
}

export default function DashboardPage() {
  return <DashboardShell />
}
