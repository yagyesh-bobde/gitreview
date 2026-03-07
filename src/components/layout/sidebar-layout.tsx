'use client';

import { useCallback, useRef, type ReactNode, type MouseEvent } from 'react';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { useUIStore, SIDEBAR_MIN, SIDEBAR_MAX } from '@/stores/ui-store';
import { cn } from '@/lib/utils/cn';

interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  const { sidebarWidth, sidebarCollapsed, setSidebarWidth, toggleSidebar } = useUIStore();
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };

      const handleMouseMove = (ev: globalThis.MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        const newWidth = dragRef.current.startWidth + delta;
        setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, newWidth)));
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-[width] duration-200',
          sidebarCollapsed && 'w-0 overflow-hidden border-r-0',
        )}
        style={sidebarCollapsed ? undefined : { width: sidebarWidth }}
      >
        {/* Sidebar header with collapse toggle */}
        <div className="flex h-10 items-center justify-between border-b border-zinc-800 px-3">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Files</span>
          <button
            onClick={toggleSidebar}
            className="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-hidden">{sidebar}</div>
      </aside>

      {/* Drag handle */}
      {!sidebarCollapsed && (
        <div
          className="group relative z-20 flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-zinc-700/50"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        >
          <div className="h-8 w-0.5 rounded-full bg-zinc-700 transition-colors group-hover:bg-zinc-500" />
        </div>
      )}

      {/* Collapsed state: expand toggle */}
      {sidebarCollapsed && (
        <div className="flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 p-1">
          <button
            onClick={toggleSidebar}
            className="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="size-3.5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
