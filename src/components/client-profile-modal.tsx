'use client';

import React, { useState, useEffect } from 'react';
import { SalesLead, SalesPayment, fetchPaymentsForLead } from '@/lib/sales';
import { toast } from 'sonner';
import { 
  User, 
  Handshake, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Calendar, 
  History,
  Briefcase,
  Loader2,
  DollarSign
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientLeads: SalesLead[];
  onAddPaymentClick?: (lead: SalesLead) => void;
}

export function ClientProfileModal({
  isOpen,
  onClose,
  clientName,
  clientLeads,
  onAddPaymentClick,
}: ClientProfileModalProps) {
  const [paymentsMap, setPaymentsMap] = useState<Record<string, SalesPayment[]>>({});
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    async function loadAllPayments() {
      setLoadingPayments(true);
      const map: Record<string, SalesPayment[]> = {};
      for (const lead of clientLeads) {
        if (lead.id) {
          const payments = await fetchPaymentsForLead(lead.id);
          map[lead.id] = payments;
        }
      }
      setPaymentsMap(map);
      setLoadingPayments(false);
    }

    if (isOpen && clientLeads.length > 0) {
      loadAllPayments();
    }
  }, [isOpen, clientLeads]);

  // Client Cumulative Financial Summaries
  let totalLeadsCount = 0;
  let totalDealUSD = 0;
  let totalDealPKR = 0;
  let totalPaidUSD = 0;
  let totalPaidPKR = 0;

  clientLeads.forEach((l) => {
    if (l.status !== 'cancelled') {
      totalLeadsCount += Number(l.lead_count || 1);
      totalDealUSD += Number(l.deal_amount_usd || 0);
      totalDealPKR += Number(l.deal_amount_pkr || 0);
      totalPaidUSD += Number(l.received_amount_usd || 0);
      totalPaidPKR += Number(l.received_amount_pkr || 0);
    }
  });

  const remainingUSD = Math.max(0, totalDealUSD - totalPaidUSD);
  const remainingPKR = Math.max(0, totalDealPKR - totalPaidPKR);

  // All payments flattened for timeline
  const allInstallments = Object.values(paymentsMap).flat().sort((a, b) => b.payment_date.localeCompare(a.payment_date));

  const formatPKR = (val: number) =>
    'Rs ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(val);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[850px] bg-white border border-slate-200 shadow-2xl rounded-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:border-none print:shadow-none">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 text-white rounded-lg shadow-sm">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-extrabold text-slate-900">
                    Client Account Profile: {clientName}
                  </DialogTitle>
                  <Badge className="bg-slate-900 text-white text-[10px]">Active Partner</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official Statement & Lead Settlement Ledger for {clientName}.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print Client Statement
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Financial Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Leads Sent */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Leads Provided
              </span>
              <div className="text-xl font-extrabold text-slate-900">{totalLeadsCount} Leads</div>
              <span className="text-[11px] text-slate-400 block">{clientLeads.length} batch records</span>
            </div>

            {/* Total Deal Amount */}
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Deal Volume
              </span>
              <div className="text-lg font-extrabold text-slate-900">{formatPKR(totalDealPKR)}</div>
              <span className="text-xs font-semibold text-slate-500 block">{formatUSD(totalDealUSD)}</span>
            </div>

            {/* Total Paid */}
            <div className="bg-emerald-50/70 p-4 border border-emerald-200 rounded-lg space-y-1">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                Paid by {clientName}
              </span>
              <div className="text-lg font-extrabold text-emerald-950">{formatPKR(totalPaidPKR)}</div>
              <span className="text-xs font-semibold text-emerald-700 block">{formatUSD(totalPaidUSD)}</span>
            </div>

            {/* Remaining Due Balance */}
            <div className="bg-amber-50/80 p-4 border border-amber-200 rounded-lg space-y-1">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                Balance Due
              </span>
              <div className="text-lg font-extrabold text-amber-950">{formatPKR(remainingPKR)}</div>
              <span className="text-xs font-semibold text-amber-700 block">{formatUSD(remainingUSD)}</span>
            </div>
          </div>

          {/* 7-Day Cycle Lead Batches List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-600" />
              7-Day Cycle Batches & Lead Records
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-slate-700 font-bold">Date & Batch Cycle</TableHead>
                    <TableHead className="text-slate-700 font-bold">Lead Project / Title</TableHead>
                    <TableHead className="text-slate-700 font-bold">Leads Count</TableHead>
                    <TableHead className="text-slate-700 font-bold">Agreed Deal</TableHead>
                    <TableHead className="text-slate-700 font-bold">Paid So Far</TableHead>
                    <TableHead className="text-slate-700 font-bold">Due Balance</TableHead>
                    <TableHead className="text-slate-700 font-bold text-right print:hidden">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientLeads.map((lead) => {
                    const remP = Math.max(0, lead.deal_amount_pkr - lead.received_amount_pkr);
                    const remU = Math.max(0, lead.deal_amount_usd - lead.received_amount_usd);

                    return (
                      <TableRow key={lead.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                        <TableCell className="py-3 px-4 font-semibold text-slate-900 text-xs">
                          {lead.date}
                          <span className="text-[10px] text-slate-500 block font-normal">{lead.cycle_name || '7-Day Batch'}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-bold text-slate-900 text-xs">
                          {lead.lead_title}
                          {lead.lead_details && (
                            <span className="text-[10px] text-slate-500 font-normal block truncate max-w-xs">
                              {lead.lead_details}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 font-semibold text-slate-700 text-xs">
                          <Badge variant="outline" className="text-xs bg-white">
                            {lead.lead_count || 1} Leads
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-bold text-slate-900 text-xs">
                          {formatPKR(lead.deal_amount_pkr)} / <span className="text-slate-500 text-[10px]">{formatUSD(lead.deal_amount_usd)}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-bold text-emerald-700 text-xs">
                          {formatPKR(lead.received_amount_pkr)} / <span className="text-emerald-500 text-[10px]">{formatUSD(lead.received_amount_usd)}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-bold text-amber-800 text-xs">
                          {formatPKR(remP)} / <span className="text-amber-600 text-[10px]">{formatUSD(remU)}</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right print:hidden">
                          {onAddPaymentClick && (
                            <Button
                              size="sm"
                              onClick={() => onAddPaymentClick(lead)}
                              className="text-[11px] h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              + Installment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment Installments Timeline History */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-slate-600" />
              Date-Wise Payment Installment History
            </h3>

            {loadingPayments ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading payment history...
              </div>
            ) : allInstallments.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center text-slate-500 text-xs">
                No individual partial payment installments logged yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-slate-700 font-bold">Payment Date</TableHead>
                      <TableHead className="text-slate-700 font-bold">Amount Paid (Rs)</TableHead>
                      <TableHead className="text-slate-700 font-bold">Amount Paid ($)</TableHead>
                      <TableHead className="text-slate-700 font-bold">Notes / Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInstallments.map((pmt) => (
                      <TableRow key={pmt.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                        <TableCell className="py-2.5 px-4 font-semibold text-slate-900 text-xs">
                          {pmt.payment_date}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 font-bold text-emerald-700 text-xs">
                          {formatPKR(pmt.amount_pkr)}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 font-bold text-emerald-700 text-xs">
                          {formatUSD(pmt.amount_usd)}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-slate-600 text-xs">
                          {pmt.payment_notes || 'Partial payment received'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
