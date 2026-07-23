'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { LayoutDashboard, ReceiptText, Users, LogOut, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const pathname = usePathname();
  const { role, signOut, profile } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['boss', 'manager'],
    },
    {
      name: 'Transactions',
      href: '/dashboard/transactions',
      icon: ReceiptText,
      roles: ['boss', 'manager'],
    },
    {
      name: 'User Management',
      href: '/dashboard/users',
      icon: Users,
      roles: ['boss'],
    },
  ];

  const visibleNav = navigation.filter(item => item.roles.includes(role || ''));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white">
            <span className="text-sm font-bold">EO</span>
          </div>
          <span className="text-lg tracking-tight">ExpenseOffice</span>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {role === 'pending' ? (
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm flex gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Access Pending</p>
              <p className="text-xs mt-1">An administrator needs to approve your account before you can view financial data.</p>
            </div>
          </div>
        ) : (
          visibleNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-slate-900' : 'text-slate-400')} />
                {item.name}
              </Link>
            );
          })
        )}
      </nav>

      {/* User Session Footer */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold text-sm uppercase">
            {profile?.full_name?.substring(0, 2) || profile?.email?.substring(0, 2) || 'US'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-500 capitalize truncate">
              {profile?.role || 'Guest'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="w-full flex justify-center gap-2 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
