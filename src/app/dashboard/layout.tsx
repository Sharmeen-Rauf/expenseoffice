'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, role, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Handle RLS/Pending registration state
  if (role === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 border border-slate-200 rounded-lg shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-200">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Pending Approval</h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Your registration was successful, but your account is currently pending approval.
            Please request the administrator (Boss) to activate your account.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
        {/* Top Header */}
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
