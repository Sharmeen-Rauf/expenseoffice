'use client';

import React from 'react';
import { UserCheck, Wallet, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface Transaction {
  id: string;
  date: string;
  item: string;
  detail: string | null;
  type: 'income' | 'expense';
  currency: 'USD' | 'PKR';
  amount_usd: number;
  amount_pkr: number;
  paid_by: string;
  category: 'Office' | 'Hardware' | 'Utilities' | 'Salaries' | 'Investment';
}

interface PaidByAnalyticsProps {
  transactions: Transaction[];
}

export function PaidByAnalytics({ transactions }: PaidByAnalyticsProps) {
  // Aggregate data by paid_by (case-insensitive grouping)
  const payerStatsMap: Record<
    string,
    {
      displayName: string;
      expenseUSD: number;
      expensePKR: number;
      incomeUSD: number;
      incomePKR: number;
      count: number;
    }
  > = {};

  let grandTotalExpenseUSD = 0;

  transactions.forEach((tx) => {
    const rawName = (tx.paid_by || 'Unspecified').trim();
    const key = rawName.toUpperCase();

    if (!payerStatsMap[key]) {
      payerStatsMap[key] = {
        displayName: rawName,
        expenseUSD: 0,
        expensePKR: 0,
        incomeUSD: 0,
        incomePKR: 0,
        count: 0,
      };
    }

    const usdVal = Number(tx.amount_usd || 0);
    const pkrVal = Number(tx.amount_pkr || 0);

    payerStatsMap[key].count += 1;

    if (tx.type === 'expense') {
      payerStatsMap[key].expenseUSD += usdVal;
      payerStatsMap[key].expensePKR += pkrVal;
      grandTotalExpenseUSD += usdVal;
    } else {
      payerStatsMap[key].incomeUSD += usdVal;
      payerStatsMap[key].incomePKR += pkrVal;
    }
  });

  const payersList = Object.values(payerStatsMap).sort(
    (a, b) => b.expenseUSD - a.expenseUSD
  );

  const formatPKR = (val: number) =>
    'Rs ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(val);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const maxExpenseUSD = Math.max(...payersList.map((p) => p.expenseUSD), 1);

  return (
    <div className="bg-white p-6 border border-slate-200 rounded-lg shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-900 text-white rounded">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              "Paid By" Expenditure Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Track exactly who has paid how much for office expenses & transactions.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-semibold text-xs">
          {payersList.length} Active Payers
        </Badge>
      </div>

      {payersList.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 font-medium">
          No payer data available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payersList.map((payer, idx) => {
            const pctOfMax = Math.round((payer.expenseUSD / maxExpenseUSD) * 100);
            const isTopContributor = idx === 0 && payer.expenseUSD > 0;

            return (
              <div
                key={payer.displayName}
                className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3 relative group"
              >
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs uppercase tracking-wider">
                      {payer.displayName.slice(0, 3)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {payer.displayName}
                        {isTopContributor && (
                          <span title="Top Spender">
                            <Award className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {payer.count} {payer.count === 1 ? 'transaction' : 'transactions'}
                      </p>
                    </div>
                  </div>

                  {isTopContributor && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                      Top Paid
                    </Badge>
                  )}
                </div>

                {/* Amount breakdown */}
                <div className="bg-white p-3 border border-slate-200/80 rounded-md space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Paid:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatPKR(payer.expensePKR)} <span className="text-slate-400 font-normal">+</span> {formatUSD(payer.expenseUSD)}
                    </span>
                  </div>

                  {payer.incomeUSD > 0 || payer.incomePKR > 0 ? (
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Income Received:
                      </span>
                      <span className="font-semibold">
                        {formatPKR(payer.incomePKR)} + {formatUSD(payer.incomeUSD)}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Relative progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>Volume Share</span>
                    <span>{pctOfMax}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all duration-500"
                      style={{ width: `${pctOfMax}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
