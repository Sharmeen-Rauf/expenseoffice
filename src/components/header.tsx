'use client';

import { useAuth } from '@/context/auth';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';
import { CalendarDays, Shield } from 'lucide-react';

export function Header() {
  const { profile } = useAuth();
  const pathname = usePathname();

  // Get Page Title from Route
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard/transactions')) return 'Transactions Registry';
    if (pathname.startsWith('/dashboard/users')) return 'User Access Controls';
    return 'Financial Analytics';
  };

  const getRoleBadgeVariant = () => {
    if (profile?.role === 'boss') return 'default';
    if (profile?.role === 'manager') return 'secondary';
    return 'outline';
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="hidden items-center gap-1.5 text-sm text-slate-500 md:flex">
          <CalendarDays className="h-4 w-4" />
          <span>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Separator */}
        <div className="hidden h-4 w-px bg-slate-200 md:block"></div>

        {/* User Profile Summary */}
        <div className="flex items-center gap-2">
          {profile?.role && (
            <Badge className="capitalize font-medium flex gap-1 items-center" variant={getRoleBadgeVariant()}>
              <Shield className="h-3 w-3" />
              {profile.role}
            </Badge>
          )}
          <span className="text-sm font-medium text-slate-700">
            {profile?.full_name || profile?.email || 'Guest'}
          </span>
        </div>
      </div>
    </header>
  );
}
