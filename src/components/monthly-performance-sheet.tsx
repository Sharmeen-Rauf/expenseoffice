'use client';

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, FileSpreadsheet, Sparkles } from 'lucide-react';

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

interface MonthlyPerformanceSheetProps {
  transactions: Transaction[];
}

export function MonthlyPerformanceSheet({ transactions }: MonthlyPerformanceSheetProps) {
  const monthlyRows = useMemo(() => {
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
        txCount: number;
      }
    > = {};

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        const [yearStr, monthStr] = monthKey.split('-');
        const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
        const labelStr = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        map[monthKey] = {
          monthKey,
          label: labelStr,
          incomeUSD: 0,
          incomePKR: 0,
          expenseUSD: 0,
          expensePKR: 0,
          netUSD: 0,
          netPKR: 0,
          txCount: 0,
        };
      }

      map[monthKey].txCount += 1;
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

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [transactions]);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatPKR = (val: number) =>
    'Rs ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(val);

  const getPerformanceBadge = (netUSD: number, incomeUSD: number) => {
    if (netUSD < 0) {
      return (
        <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
          <ArrowDownRight className="h-3 w-3 mr-0.5" /> Deficit
        </Badge>
      );
    }
    const margin = incomeUSD > 0 ? (netUSD / incomeUSD) * 100 : 100;
    if (margin >= 30 || netUSD > 1000) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
          <Sparkles className="h-3 w-3 mr-0.5" /> High Profit
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
        <ArrowUpRight className="h-3 w-3 mr-0.5" /> Profit
      </Badge>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs space-y-3 p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-slate-700" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Monthly Performance Ledger Sheet
          </h3>
        </div>
        <Badge variant="outline" className="text-xs text-slate-500 font-semibold">
          {monthlyRows.length} Recorded Months
        </Badge>
      </div>

      <div className="border border-slate-200 rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="text-slate-700 font-bold">Month & Year</TableHead>
              <TableHead className="text-slate-700 font-bold">Monthly Income</TableHead>
              <TableHead className="text-slate-700 font-bold">Monthly Expenses</TableHead>
              <TableHead className="text-slate-700 font-bold">Net Profit / Deficit</TableHead>
              <TableHead className="text-slate-700 font-bold">Profit Margin</TableHead>
              <TableHead className="text-slate-700 font-bold text-right">Performance Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500 text-xs font-medium">
                  No monthly transactions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              monthlyRows.map((row) => {
                const marginPct =
                  row.incomeUSD > 0
                    ? Math.round((row.netUSD / row.incomeUSD) * 100)
                    : row.netUSD > 0
                    ? 100
                    : 0;

                return (
                  <TableRow key={row.monthKey} className="hover:bg-slate-50/70 border-b border-slate-100">
                    <TableCell className="py-3 px-4 font-bold text-slate-900 text-xs">
                      {row.label}
                      <span className="text-[10px] text-slate-400 font-normal block">{row.txCount} transactions</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-emerald-700 text-xs">
                      {formatUSD(row.incomeUSD)}
                      <span className="text-[10px] text-slate-500 font-normal block">{formatPKR(row.incomePKR)}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-rose-700 text-xs">
                      {formatUSD(row.expenseUSD)}
                      <span className="text-[10px] text-slate-500 font-normal block">{formatPKR(row.expensePKR)}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-xs">
                      <span className={row.netUSD >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {row.netUSD >= 0 ? '+' : ''}
                        {formatUSD(row.netUSD)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal block">{formatPKR(row.netPKR)}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs font-semibold text-slate-700">
                      {marginPct}%
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      {getPerformanceBadge(row.netUSD, row.incomeUSD)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
