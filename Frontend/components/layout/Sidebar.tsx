'use client'

import React, { createContext, useContext, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logomark } from '@/components/brand'
import { Icons } from '@/components/ui/icons'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSession } from 'next-auth/react'

// Sidebar context
interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider')
  return context
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const toggle = () => setIsCollapsed(!isCollapsed)
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navItems: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { href: '/', label: 'Dashboard', icon: Icons.dashboard },
      { href: '/terminal', label: 'Command Center', icon: Icons.command },
      { href: '/workbench', label: 'Workbench', icon: Icons.workbench },
    ],
  },
  {
    title: 'AI Intelligence',
    items: [
      { href: '/ai/policies', label: 'AI Policies', icon: Icons.shield },
      { href: '/ai/insights', label: 'AI Insights', icon: Icons.lineChart },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Icons.settings },
    ],
  },
]

interface NavLinkProps {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  isCollapsed?: boolean
  badge?: number
}

function NavLink({ href, icon: Icon, children, isCollapsed, badge }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  const linkContent = (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
        'text-sm font-semibold',
        'transition-all duration-300 ease-out',
        isActive
          ? [
              'bg-blue-50/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
              'border border-blue-100 dark:border-blue-500/20 shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_12px_-3px_rgba(59,130,246,0.3)]',
            ]
          : [
              'text-slate-500 dark:text-slate-400 border border-transparent',
              'hover:bg-slate-100/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white',
            ],
        isCollapsed && 'justify-center px-2'
      )}
    >
      {/* Active indicator */}
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400 shadow-sm" />
      )}

      <Icon
        strokeWidth={2}
        className={cn(
          'h-4.5 w-4.5 shrink-0 transition-all duration-300 group-hover:scale-110',
          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-550 group-hover:text-slate-700 dark:group-hover:text-slate-300'
        )}
      />

      {!isCollapsed && <span className="truncate">{children}</span>}

      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5',
            'text-[9px] font-bold',
            isActive ? 'bg-blue-200/50 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-white/40',
            isCollapsed && 'absolute -right-1 -top-1'
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="ml-2 bg-slate-900 border-slate-800 text-slate-100 dark:bg-[#0d1117] dark:border-white/10 dark:text-white/80 font-medium rounded-lg px-2.5 py-1 text-xs">
          {children}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

function SidebarUser({ isCollapsed }: { isCollapsed: boolean }) {
  const { data: session } = useSession()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  if (!session?.user) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl p-2.5',
        'border border-slate-200/60 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.02]',
        isCollapsed && 'justify-center p-2'
      )}
    >
      <Avatar
        src={session.user.image}
        fallback={session.user.name || session.user.email || '?'}
        size="sm"
        showStatus
        status="online"
      />
      {!isCollapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-355">{session.user.name}</p>
          <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">{session.user.email}</p>
        </div>
      )}
      {!isCollapsed && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => { window.location.href = `${basePath}/api/auth/logout` }}
          className="shrink-0 text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/60"
          title="Sign Out"
        >
          <Icons.logout className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const { data: session } = useSession()
  const isAdmin = session?.roles?.includes('admin')

  const filteredNavItems = navItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <TooltipProvider>
      <aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'hidden flex-col md:flex',
          'fixed bottom-0 left-0 top-0 z-fixed',
          // Theme-responsive background & border
          'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#05070c] dark:to-[#090d16]',
          'border-r border-slate-200/80 dark:border-white/[0.05]',
          // Shadow & transition
          'shadow-sm dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]',
          'transition-all duration-300 ease-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-[4.5rem] items-center px-4',
            'border-b border-slate-100 dark:border-white/[0.04]',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Link href="/" className="group flex items-center gap-3">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl',
                'bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500/20',
                'shadow-[0_4px_12px_rgba(37,99,235,0.15)] dark:shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]',
                'transition-all duration-300',
                'group-hover:shadow-[0_6px_16px_rgba(37,99,235,0.25)]'
              )}
            >
              <Logomark variant="light" size={20} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-display text-[0.95rem] font-bold tracking-tight text-slate-800 dark:text-white">
                  AutoPilot
                </span>
                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-primary">
                  Command Center
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav
          aria-label="Primary navigation"
          className="scrollbar-hide flex-1 overflow-y-auto px-3 py-5"
        >
          {filteredNavItems.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && 'mt-7')}>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-slate-450 dark:text-slate-500">
                  {section.title}
                </p>
              )}
              {isCollapsed && sectionIndex > 0 && (
                <div className="mx-auto mb-4 h-px w-6 bg-slate-200 dark:bg-white/[0.06]" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    isCollapsed={isCollapsed}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 dark:border-white/[0.04] p-3">
          <SidebarUser isCollapsed={isCollapsed} />
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-slate-100 dark:border-white/[0.04] p-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon-sm' : 'sm'}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  'w-full text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/60 hover:bg-slate-100/50 dark:hover:bg-white/[0.04]',
                  isCollapsed && 'px-0'
                )}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <Icons.panelOpen className="h-4 w-4" />
                ) : (
                  <>
                    <Icons.panelClose className="h-4 w-4" />
                    <span className="ml-2 text-xs">Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="ml-2 bg-slate-900 border-slate-800 text-slate-100 dark:bg-[#0d1117] dark:border-white/10 dark:text-white/80 font-medium rounded-lg px-2.5 py-1 text-xs">
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
