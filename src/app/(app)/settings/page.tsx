'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Users, Palette, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountManagement } from './_components/account-management';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionId = 'accounts';

interface NavItem {
  id: SectionId | 'appearance' | 'notifications';
  label: string;
  icon: typeof Users;
  comingSoon?: boolean;
}

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  { id: 'accounts', label: 'Accounts', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette, comingSoon: true },
  { id: 'notifications', label: 'Notifications', icon: Bell, comingSoon: true },
];

// ---------------------------------------------------------------------------
// Sidebar nav item
// ---------------------------------------------------------------------------

interface SidebarItemProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

function SidebarItem({ item, isActive, onClick }: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={item.comingSoon ? undefined : onClick}
      disabled={item.comingSoon}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
        isActive
          ? 'bg-zinc-800 text-zinc-100'
          : item.comingSoon
            ? 'cursor-default text-zinc-600'
            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          isActive ? 'text-zinc-200' : item.comingSoon ? 'text-zinc-700' : 'text-zinc-500',
        )}
      />
      <span className="flex-1 text-left">{item.label}</span>
      {item.comingSoon && (
        <span className="rounded-sm bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium leading-none text-zinc-500">
          Soon
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('accounts');

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Page header */}
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
        <Link
          href="/dashboard"
          className="-ml-1.5 flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft className="size-3.5" />
          <span className="font-medium">Back</span>
        </Link>

        <div className="h-4 w-px bg-zinc-800" />

        <h1 className="text-sm font-semibold text-zinc-200">Settings</h1>
      </header>

      {/* Body */}
      <div className="flex flex-1">
        {/* Sidebar — hidden on mobile, visible from md up */}
        <aside className="hidden w-52 shrink-0 border-r border-zinc-800 md:block">
          <nav className="sticky top-12 p-3" aria-label="Settings navigation">
            <ul className="space-y-0.5" role="list">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <SidebarItem
                    item={item}
                    isActive={activeSection === item.id}
                    onClick={() => setActiveSection(item.id as SectionId)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-8 md:px-10">
          <div className="mx-auto max-w-2xl">
            {activeSection === 'accounts' && <AccountManagement />}
          </div>
        </main>
      </div>
    </div>
  );
}
