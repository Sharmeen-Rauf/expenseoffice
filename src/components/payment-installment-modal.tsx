'use client';

import React, { useState } from 'react';
import { SalesLead, addPaymentInstallment } from '@/lib/sales';
import { createAuditLog } from '@/lib/audit';
import { toast } from 'sonner';
import { Loader2, DollarSign, CreditCard, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead: SalesLead;
}

export function PaymentInstallmentModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
}: PaymentInstallmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [amountPkr, setAmountPkr] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const currentRemPkr = Math.max(0, Number(lead.deal_amount_pkr || 0) - Number(lead.received_amount_pkr || 0));
  const currentRemUsd = Math.max(0, Number(lead.deal_amount_usd || 0) - Number(lead.received_amount_usd || 0));

  const pkrVal = parseFloat(amountPkr) || 0;
  const usdVal = parseFloat(amountUsd) || 0;

  const newRemPkr = Math.max(0, currentRemPkr - pkrVal);
  const newRemUsd = Math.max(0, currentRemUsd - usdVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pkrVal <= 0 && usdVal <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setLoading(true);
    try {
      await addPaymentInstallment(
        lead.id!,
        {
          payment_date: paymentDate,
          amount_pkr: pkrVal,
          amount_usd: usdVal,
          payment_notes: paymentNotes.trim() || 'Client Partial Payment',
        },
        lead
      );

      await createAuditLog({
        transactionId: lead.id,
        action: 'UPDATE',
        itemName: `Payment Received: ${lead.client_name}`,
        details: `Recorded payment installment from ${lead.client_name} (Rs ${pkrVal} / $${usdVal}). Remaining Due: Rs ${newRemPkr} / $${newRemUsd}`,
      });

      toast.success(`Payment installment of Rs ${pkrVal} recorded successfully!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error;
      toast.error(error.message || 'Failed to record payment installment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-[95vw] sm:max-w-[480px] bg-white border border-slate-200 shadow-xl rounded-lg p-4 sm:p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Record Payment from {lead.client_name}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Add partial payment installment for lead: <span className="font-semibold text-slate-700">{lead.lead_title}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          {/* Current Balance Summary Pill */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block font-medium">Current Balance Due:</span>
              <span className="font-bold text-amber-900 text-sm">
                Rs {new Intl.NumberFormat('en-PK').format(currentRemPkr)} / ${new Intl.NumberFormat('en-US').format(currentRemUsd)}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className="text-right">
              <span className="text-slate-500 block font-medium">Balance After Payment:</span>
              <span className="font-bold text-emerald-700 text-sm">
                Rs {new Intl.NumberFormat('en-PK').format(newRemPkr)} / ${new Intl.NumberFormat('en-US').format(newRemUsd)}
              </span>
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Payment Date</Label>
            <Input
              id="payment-date"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="border-slate-200"
            />
          </div>

          {/* Payment Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount-pkr">Received Amount (Rs)</Label>
              <Input
                id="amount-pkr"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 25000"
                value={amountPkr}
                onChange={(e) => setAmountPkr(e.target.value)}
                className="border-slate-200 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount-usd">Received Amount ($)</Label>
              <Input
                id="amount-usd"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 100"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                className="border-slate-200 font-semibold"
              />
            </div>
          </div>

          {/* Payment Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-notes">Payment Notes / Reference</Label>
            <Input
              id="payment-notes"
              type="text"
              placeholder="e.g. Bank Transfer, EasyPaisa, Cash Installment 1"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="border-slate-200"
            />
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-slate-200">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Installment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
