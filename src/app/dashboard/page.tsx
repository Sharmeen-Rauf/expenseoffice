'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { PaidByAnalytics } from '@/components/paid-by-analytics';
import { AuditLogModal } from '@/components/audit-log-modal';
import { CategoryManagerModal } from '@/components/category-manager-modal';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Filter, 
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2,
  ShieldCheck,
  Tags,
  Sun,
  CalendarCheck,
  Clock,
  Sparkles,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

interface Transaction {
  id: string;
  date: string;
  item: string;
  detail: string | null;
  type: 'income' | 'expense';
  currency: 'USD' | 'PKR';
  amount_usd: number;
  amount_pkr: number;
  paid_by: string;
  category: string;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days'>('all');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Filter lists
  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: 'all', label: 'All Years' },
    { value: String(currentYear), label: String(currentYear) },
    { value: String(currentYear - 1), label: String(currentYear - 1) },
    { value: String(currentYear - 2), label: String(currentYear - 2) },
  ];

  useEffect(() => {
    async function loadTransactions() {
      setLoading(true);
      try {
        const query = supabase.from('transactions').select('*').order('date', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        setTransactions((data as Transaction[]) || []);
      } catch (err: unknown) {
        console.error('Error loading transactions:', err);
        toast.error('Failed to load transaction data.');
      } finally {
        setLoading(false);
      }
    }

    if (role === 'boss' || role === 'manager') {
      loadTransactions();
    }
  }, [role]);

  // Today's date calculations
  const todayObj = new Date();
  const todayStr = todayObj.toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const yesterdayObj = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayObj.toLocaleDateString('en-CA');
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  // Calculate Today's specific totals
  let todayIncomeUSD = 0;
  let todayIncomePKR = 0;
  let todayExpenseUSD = 0;
  let todayExpensePKR = 0;
  let todayCount = 0;

  transactions.forEach((tx) => {
    if (tx.date === todayStr) {
      todayCount += 1;
      if (tx.type === 'income') {
        todayIncomeUSD += Number(tx.amount_usd || 0);
        todayIncomePKR += Number(tx.amount_pkr || 0);
      } else {
        todayExpenseUSD += Number(tx.amount_usd || 0);
        todayExpensePKR += Number(tx.amount_pkr || 0);
      }
    }
  });

  const todayNetUSD = todayIncomeUSD - todayExpenseUSD;
  const todayNetPKR = todayIncomePKR - todayExpensePKR;

  // Apply date filters in-memory
  const filteredTransactions = transactions.filter((tx) => {
    const txDateObj = new Date(tx.date);
    const txMonth = String(txDateObj.getMonth() + 1).padStart(2, '0');
    const txYear = String(txDateObj.getFullYear());

    // Date Preset filter
    if (datePreset === 'today' && tx.date !== todayStr) return false;
    if (datePreset === 'yesterday' && tx.date !== yesterdayStr) return false;
    if (datePreset === '7days' && txDateObj < sevenDaysAgo) return false;
    if (datePreset === '30days' && txDateObj < thirtyDaysAgo) return false;

    // Month & Year select filter
    const monthMatch = selectedMonth === 'all' || txMonth === selectedMonth;
    const yearMatch = selectedYear === 'all' || txYear === selectedYear;

    return monthMatch && yearMatch;
  });

  // Calculate overall totals for filtered subset
  let totalIncomeUSD = 0;
  let totalIncomePKR = 0;
  let totalExpenseUSD = 0;
  let totalExpensePKR = 0;

  filteredTransactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncomeUSD += Number(tx.amount_usd || 0);
      totalIncomePKR += Number(tx.amount_pkr || 0);
    } else {
      totalExpenseUSD += Number(tx.amount_usd || 0);
      totalExpensePKR += Number(tx.amount_pkr || 0);
    }
  });

  const netUSD = totalIncomeUSD - totalExpenseUSD;
  const netPKR = totalIncomePKR - totalExpensePKR;

  // Category summary calculation dynamically
  const categoryTotals: Record<string, { usd: number; pkr: number }> = {};

  filteredTransactions.forEach((tx) => {
    const cat = tx.category || 'General';
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { usd: 0, pkr: 0 };
    }
    categoryTotals[cat].usd += Number(tx.amount_usd || 0);
    categoryTotals[cat].pkr += Number(tx.amount_pkr || 0);
  });

  const recentTransactions = filteredTransactions.slice(0, 5);

  const formatCurrency = (val: number, isUSD: boolean) => {
    return isUSD
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
      : 'Rs ' + new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* TODAY'S LIVE SUMMARY WIDGET BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 text-white p-6 rounded-xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
              <Sun className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Today's Live Financial Summary</h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  LIVE REALTIME
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {todayObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                <span className="ml-2 text-slate-500">• {todayCount} entries today</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setDatePreset(datePreset === 'today' ? 'all' : 'today')}
              className={`text-xs font-semibold rounded-md border ${
                datePreset === 'today'
                  ? 'bg-white text-slate-900 border-white font-bold shadow-md'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
              {datePreset === 'today' ? 'Viewing Today Only' : 'Filter Today Only'}
            </Button>
          </div>
        </div>

        {/* 3 Today Stat Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Today Income */}
          <div className="bg-slate-900/80 p-4 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
              <span>Today's Income</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatCurrency(todayIncomeUSD, true)}</div>
              <div className="text-xs font-medium text-emerald-400/90 mt-0.5">{formatCurrency(todayIncomePKR, false)}</div>
            </div>
          </div>

          {/* Today Expense */}
          <div className="bg-slate-900/80 p-4 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-rose-400 font-semibold mb-1">
              <span>Today's Expense</span>
              <ArrowDownRight className="h-4 w-4 text-rose-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatCurrency(todayExpenseUSD, true)}</div>
              <div className="text-xs font-medium text-rose-400/90 mt-0.5">{formatCurrency(todayExpensePKR, false)}</div>
            </div>
          </div>

          {/* Today Net Balance */}
          <div className="bg-slate-900/80 p-4 border border-slate-800 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
              <span>Today's Cashflow</span>
              <Wallet className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatCurrency(todayNetUSD, true)}</div>
              <div className="text-xs font-medium text-slate-300 mt-0.5">{formatCurrency(todayNetPKR, false)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Title Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ledger Overview</h2>
          <p className="text-sm text-slate-500">Corporate balance summary and financial performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role === 'boss' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            >
              <Tags className="h-4 w-4 text-slate-600" />
              Manage Categories
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAuditModalOpen(true)}
            className="flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            Audit Trail
          </Button>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-md shadow-xs">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filters</span>
          </div>

          <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val || 'all')}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || 'all')}>
            <SelectTrigger className="w-[120px] bg-white border-slate-200">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* QUICK DATE RANGE PRESET PILL TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" /> Range:
        </span>
        {[
          { key: 'all', label: 'All Time' },
          { key: 'today', label: 'Today' },
          { key: 'yesterday', label: 'Yesterday' },
          { key: '7days', label: 'Last 7 Days' },
          { key: '30days', label: 'Last 30 Days' },
        ].map((tab) => {
          const isActive = datePreset === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setDatePreset(tab.key as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Income Card */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Income</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalIncomeUSD, true)}</div>
            <div className="text-sm font-semibold text-slate-500 mt-1">{formatCurrency(totalIncomePKR, false)}</div>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Expense</span>
            <div className="p-2 bg-rose-50 text-rose-700 border border-rose-100 rounded">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenseUSD, true)}</div>
            <div className="text-sm font-semibold text-slate-500 mt-1">{formatCurrency(totalExpensePKR, false)}</div>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`p-6 border rounded-lg shadow-xs flex flex-col justify-between h-40 bg-white ${
          netUSD >= 0 ? 'border-emerald-200 border-l-4' : 'border-rose-200 border-l-4'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Net Profit / Balance</span>
            <div className={`p-2 rounded border ${
              netUSD >= 0 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(netUSD, true)}</div>
              <Badge className={netUSD >= 0 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200' : 'bg-rose-50 text-rose-700 hover:bg-rose-50 border border-rose-200'}>
                {netUSD >= 0 ? 'Profit' : 'Deficit'}
              </Badge>
            </div>
            <div className="text-sm font-semibold text-slate-500 mt-1">{formatCurrency(netPKR, false)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category breakdown (2/3 width or 1/3) */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Category Expenditures</h3>
          <div className="space-y-4">
            {Object.entries(categoryTotals).map(([cat, amount]) => {
              const maxUSD = Math.max(...Object.values(categoryTotals).map(a => a.usd), 1);
              const progressPct = Math.round((amount.usd / maxUSD) * 100);

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{cat}</span>
                    <span className="text-slate-900">{formatCurrency(amount.usd, true)} / <span className="text-slate-500 text-[10px]">{formatCurrency(amount.pkr, false)}</span></span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-900 rounded-full transition-all duration-500" 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Activity</h3>
            <Link href="/dashboard/transactions">
              <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-950 font-medium">
                View Ledger Registry
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No transaction records found.</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${
                      tx.type === 'income' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{tx.item}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="capitalize">{tx.category}</span>
                        <span>•</span>
                        <span>Paid by {tx.paid_by}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount_usd, true)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatCurrency(tx.amount_pkr, false)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Paid By Analytics Breakdown Widget */}
      <PaidByAnalytics transactions={filteredTransactions} />

      {/* Audit Log Modal */}
      {auditModalOpen && (
        <AuditLogModal
          isOpen={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

      {/* Category Manager Modal */}
      {categoryModalOpen && (
        <CategoryManagerModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
        />
      )}
    </div>
  );
}
