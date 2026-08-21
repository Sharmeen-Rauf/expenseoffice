'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { useLedger } from '@/context/ledger';
import { LayoutDashboard, ReceiptText, Users, LogOut, ShieldAlert, X, Handshake, Building2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, signOut, profile } = useAuth();
  const { isPartner, ledgerBadge } = useLedger();

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
      name: 'Sales & Leads',
      href: '/dashboard/sales',
      icon: Handshake,
      roles: ['boss', 'manager'],
    },
    {
      name: 'User Management',
      href: '/dashboard/users',
      icon: Users,
      roles: ['boss'],
    },
  ];

  const visibleNav = navigation.filter((item) => item.roles.includes(role || ''));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2 font-semibold text-slate-900"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white shadow-xs">
              <span className="text-sm font-bold tracking-wider">AE</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base tracking-tight font-extrabold leading-tight">Alara Expense</span>
              <Badge
                className={`text-[9px] py-0 px-1 font-bold w-fit ${
                  isPartner
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {ledgerBadge}
              </Badge>
            </div>
          </Link>

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden text-slate-500 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {role === 'pending' ? (
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm flex gap-2">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Access Pending</p>
                <p className="text-xs mt-1">
                  An administrator needs to approve your account before you can view financial data.
                </p>
              </div>
            </div>
          ) : (
            visibleNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
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
            onClick={() => {
              if (onClose) onClose();
              signOut();
            }}
            className="w-full flex justify-center gap-2 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
