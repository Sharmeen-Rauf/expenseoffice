'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface MonthlyTrendsChartProps {
  transactions: Transaction[];
}

export function MonthlyTrendsChart({ transactions }: MonthlyTrendsChartProps) {
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);

  // Group transactions by YYYY-MM
  const monthlyData = useMemo(() => {
    const map: Record<
      string,
      {
        monthKey: string;
        label: string;
        incomeUSD: number;
        incomePKR: number;
        expenseUSD: number;
        expensePKR: number;
        netUSD: number;
        netPKR: number;
      }
    > = {};

    // Get last 6 months list even if zero data
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' }) + ' ' + year;

      map[monthKey] = {
        monthKey,
        label: monthLabel,
        incomeUSD: 0,
        incomePKR: 0,
        expenseUSD: 0,
        expensePKR: 0,
        netUSD: 0,
        netPKR: 0,
      };
    }

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        const [yearStr, monthStr] = monthKey.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const labelStr = dateObj.toLocaleString('en-US', { month: 'short' }) + ' ' + yearStr;
        map[monthKey] = {
          monthKey,
          label: labelStr,
          incomeUSD: 0,
          incomePKR: 0,
          expenseUSD: 0,
          expensePKR: 0,
          netUSD: 0,
          netPKR: 0,
        };
      }

      if (tx.type === 'income') {
        map[monthKey].incomeUSD += Number(tx.amount_usd || 0);
        map[monthKey].incomePKR += Number(tx.amount_pkr || 0);
      } else {
        map[monthKey].expenseUSD += Number(tx.amount_usd || 0);
        map[monthKey].expensePKR += Number(tx.amount_pkr || 0);
      }
      map[monthKey].netUSD = map[monthKey].incomeUSD - map[monthKey].expenseUSD;
      map[monthKey].netPKR = map[monthKey].incomePKR - map[monthKey].expensePKR;
    });

    return Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [transactions]);

  // Max value calculation for bar height scale
  const maxValUSD = useMemo(() => {
    let max = 1;
    monthlyData.forEach((m) => {
      if (m.incomeUSD > max) max = m.incomeUSD;
      if (m.expenseUSD > max) max = m.expenseUSD;
    });
    return max;
  }, [monthlyData]);

  const activeData = hoveredMonthKey
    ? monthlyData.find((m) => m.monthKey === hoveredMonthKey)
    : monthlyData[monthlyData.length - 1];

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatPKR = (val: number) =>
    'Rs ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-700" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Monthly Income vs Expense Performance Chart
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visual breakdown of financial growth and profit trends over time.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-600">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
            <span className="text-slate-600">Expenses</span>
          </div>
        </div>
      </div>

      {/* Active Month Info Strip */}
      {activeData && (
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="font-bold text-slate-900">{activeData.label}:</span>
            <span className="text-emerald-700 font-semibold">{formatUSD(activeData.incomeUSD)}</span>
            <span className="text-slate-400">vs</span>
            <span className="text-rose-700 font-semibold">{formatUSD(activeData.expenseUSD)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium hidden sm:inline">Net Cashflow:</span>
            <Badge
              className={`font-bold border ${
                activeData.netUSD >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {activeData.netUSD >= 0 ? '+' : ''}
              {formatUSD(activeData.netUSD)} ({formatPKR(activeData.netPKR)})
            </Badge>
          </div>
        </div>
      )}

      {/* Visual Bar Chart (Dual Bars) */}
      <div className="pt-4 pb-2">
        <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 px-2 border-b border-slate-200 pb-2">
          {monthlyData.map((m) => {
            const incomePct = Math.min(100, Math.max(4, Math.round((m.incomeUSD / maxValUSD) * 100)));
            const expensePct = Math.min(100, Math.max(4, Math.round((m.expenseUSD / maxValUSD) * 100)));
            const isHovered = hoveredMonthKey === m.monthKey;

            return (
              <div
                key={m.monthKey}
                onMouseEnter={() => setHoveredMonthKey(m.monthKey)}
                onMouseLeave={() => setHoveredMonthKey(null)}
                className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all ${
                  isHovered ? 'scale-105' : ''
                }`}
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded mb-1 whitespace-nowrap shadow-md pointer-events-none z-10">
                  <div className="font-bold">{m.label}</div>
                  <div className="text-emerald-400">In: {formatUSD(m.incomeUSD)}</div>
                  <div className="text-rose-400">Out: {formatUSD(m.expenseUSD)}</div>
                  <div className="font-bold border-t border-slate-700 mt-1 pt-0.5">
                    Net: {formatUSD(m.netUSD)}
                  </div>
                </div>

                {/* Dual Bars Container */}
                <div className="flex items-end justify-center gap-1.5 w-full h-full max-w-[50px] px-1 bg-slate-50/50 rounded-t border-b border-slate-300">
                  {/* Income Bar */}
                  <div
                    className="w-full bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition-all duration-500"
                    style={{ height: `${incomePct}%` }}
                  />

                  {/* Expense Bar */}
                  <div
                    className="w-full bg-rose-500 rounded-t group-hover:bg-rose-600 transition-all duration-500"
                    style={{ height: `${expensePct}%` }}
                  />
                </div>

                {/* Month Label */}
                <span
                  className={`text-[11px] mt-2 font-medium truncate max-w-full ${
                    isHovered ? 'text-slate-900 font-bold' : 'text-slate-500'
                  }`}
                >
                  {m.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
