import type { Metadata } from 'next';
import { DashboardShell } from './_components/dashboard-shell';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return <DashboardShell />;
}
