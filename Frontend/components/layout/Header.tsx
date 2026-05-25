'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Icons } from '@/components/ui/icons'
import { useAI } from '@/context/AIContext'
import { NotificationCenter } from '@/components/NotificationCenter'
import { useSidebar } from '@/components/layout/Sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Breadcrumb helper
function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Dashboard', href: '/' }]
  }

  const breadcrumbs = [{ label: 'Dashboard', href: '/' }]

  let currentPath = ''
  segments.forEach((segment) => {
    currentPath += `/${segment}`
    const label =
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    breadcrumbs.push({ label, href: currentPath })
  })

  return breadcrumbs
}

// Search input component
function SearchInput({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette?: () => void
}) {
  return (
    <button
      onClick={onOpenCommandPalette}
      className={cn(
        'group flex h-9 w-64 items-center gap-2 px-3',
        'rounded-full border border-border/50 bg-white/40 dark:bg-black/20',
        'text-sm text-muted-foreground',
        'transition-all duration-300 ease-out',
        'hover:border-primary/40 hover:bg-white/80 dark:hover:bg-black/40 hover:shadow-sm',
        'hover:w-72',
        'focus:outline-none focus:ring-2 focus:ring-primary/50'
      )}
    >
      <Icons.search
        className='h-4 w-4 transition-transform duration-200 group-hover:scale-110'
        strokeWidth={1.8}
      />
      <span className='flex-1 text-left'>Search...</span>
      <kbd
        className={cn(
          'hidden h-5 items-center gap-1 rounded px-1.5 sm:inline-flex',
          'text-[10px] font-medium',
          'border border-border/50 bg-muted/50 text-muted-foreground',
          'transition-all duration-200',
          'group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary'
        )}
      >
        <Icons.command className='h-3 w-3' />K
      </kbd>
    </button>
  )
}

// AI Manager trigger button - styled as a prominent tag/badge
function AIManagerTrigger() {
  const { openManager, isManagerOpen } = useAI()

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={openManager}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-1.5',
              'rounded-full',
              'text-sm font-semibold',
              'transition-all duration-200',
              'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500',
              'text-white',
              'shadow-sm shadow-blue-500/10',
              'hover:shadow-md hover:shadow-indigo-500/20 hover:bg-blue-600/90',
              'hover:scale-[1.02]',
              isManagerOpen && 'ring-2 ring-primary ring-offset-2',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
            aria-label='Open AI Manager'
          >
            <Icons.sparkles
              className='h-4 w-4 text-white animate-pulse'
              strokeWidth={1.8}
            />
            <span className='hidden sm:inline'>AI Studio</span>
            <kbd className={cn(
              'hidden sm:inline-flex items-center gap-0.5',
              'px-1.5 py-0.5 rounded',
              'bg-white/20 text-white/90',
              'text-[10px] font-medium'
            )}>
              <Icons.command className='h-2.5 w-2.5' />J
            </kbd>
          </button>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='sm:hidden'>
          <span>AI Studio</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Theme Toggle component
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <Button
      variant='ghost'
      size='icon-sm'
      onClick={toggleTheme}
      className='rounded-full text-muted-foreground hover:text-foreground transition-all duration-300'
      aria-label='Toggle theme'
    >
      {isDark ? (
        <Icons.sun className='h-4.5 w-4.5 text-amber-500 animate-spin-slow' strokeWidth={2} />
      ) : (
        <Icons.moon className='h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400' strokeWidth={2} />
      )}
    </Button>
  )
}

// System Status Badge
function SystemStatusBadge() {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 sm:flex">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      <span>System: Active</span>
    </div>
  )
}

// User menu with dropdown
function UserMenu() {
  const user = { name: 'Dev User', email: 'dev@autopilot.local' }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'group flex items-center gap-1 rounded-full',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
            'transition-transform duration-200'
          )}
        >
          <div className='flex items-center gap-3'>
            <div className='hidden flex-col text-right lg:flex'>
              <span className='text-sm font-semibold text-foreground'>
                {user.name}
              </span>
              <span className='text-xs text-muted-foreground font-medium'>
                {user.email}
              </span>
            </div>
            <Avatar
              fallback={user.name}
              size='md'
              showRing
            />
            <Icons.chevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                'group-data-[state=open]:rotate-180 group-hover:translate-y-0.5'
              )}
            />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-64 glass rounded-2xl border-border/80 p-1.5 shadow-float'>
        <div className='border-b border-border/50 px-3 py-3'>
          <div className='flex items-center gap-3'>
            <Avatar
              fallback={user.name}
              size='md'
            />
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold text-foreground'>
                {user.name}
              </p>
              <p className='truncate text-xs text-muted-foreground'>
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className='py-1'>
          <DropdownMenuItem className='gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors'>
            <Icons.user className='h-4 w-4 text-muted-foreground' strokeWidth={1.8} />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem className='gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors'>
            <Icons.settings className='h-4 w-4 text-muted-foreground' strokeWidth={1.8} />
            <span>Settings</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  const { isCollapsed } = useSidebar()

  return (
    <header
      role='banner'
      className={cn(
        // Floating pill positioning
        'fixed right-4 top-4 z-sticky',
        // Adjust left position based on sidebar collapse dynamically!
        isCollapsed ? 'left-4 md:left-[calc(4rem+1rem)]' : 'left-4 md:left-[calc(16rem+1rem)]',
        // Glass pill styling
        'glass rounded-2xl shadow-float',
        // Layout
        'flex items-center justify-between',
        'h-14 px-4 lg:px-6',
        'transition-all duration-300 ease-out'
      )}
    >
      {/* Left: Mobile menu + Breadcrumb */}
      <div className='flex items-center gap-2'>
        {/* Mobile menu button */}
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={onOpenMobileMenu}
          className='-ml-1 text-muted-foreground hover:text-foreground md:hidden'
          aria-label='Open navigation menu'
        >
          <Icons.menu className='h-5 w-5' strokeWidth={1.5} />
        </Button>

        <Icons.home
          className='hidden h-4 w-4 text-muted-foreground md:block'
          strokeWidth={1.8}
        />
        <nav
          aria-label='Breadcrumb'
          className='hidden items-center gap-1.5 text-sm sm:flex'
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && (
                <Icons.chevronRight
                  className='h-3.5 w-3.5 text-muted-foreground/40'
                  aria-hidden='true'
                />
              )}
              <span
                className={cn(
                  'font-medium transition-colors',
                  index === breadcrumbs.length - 1
                    ? 'text-foreground font-semibold'
                    : 'cursor-pointer text-muted-foreground hover:text-foreground'
                )}
                aria-current={
                  index === breadcrumbs.length - 1 ? 'page' : undefined
                }
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
        {/* Mobile: Just show current page */}
        <span className='text-sm font-semibold text-foreground sm:hidden'>
          {breadcrumbs[breadcrumbs.length - 1].label}
        </span>
      </div>

      {/* Right: Actions */}
      <div className='flex items-center gap-1 sm:gap-2.5'>
        {/* System Operational Badge */}
        <SystemStatusBadge />

        {/* Search */}
        <div className='hidden lg:block'>
          <SearchInput />
        </div>

        {/* Mobile/tablet search button */}
        <Button
          variant='ghost'
          size='icon-sm'
          className='text-muted-foreground hover:text-foreground lg:hidden'
          aria-label='Search'
        >
          <Icons.search className='h-5 w-5' strokeWidth={1.5} />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationCenter />

        {/* Divider */}
        <div className='mx-1 hidden h-6 w-px bg-border/60 lg:block' />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
