'use client';

import React, { useState } from 'react';
import { SalesLead, createSalesLead, updateSalesLead } from '@/lib/sales';
import { createAuditLog } from '@/lib/audit';
import { toast } from 'sonner';
import { Loader2, Briefcase, DollarSign, Handshake } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface SalesLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead?: SalesLead | null;
}

export function SalesLeadModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
}: SalesLeadModalProps) {
  const isEditing = !!lead?.id;
  const [loading, setLoading] = useState(false);

  // Form states
  const [date, setDate] = useState(lead?.date || new Date().toLocaleDateString('en-CA'));
  const [clientName, setClientName] = useState(lead?.client_name || '');
  const [leadTitle, setLeadTitle] = useState(lead?.lead_title || '');
  const [leadDetails, setLeadDetails] = useState(lead?.lead_details || '');
  const [currency, setCurrency] = useState<'USD' | 'PKR'>(lead?.currency || 'PKR');
  const [dealAmountUsd, setDealAmountUsd] = useState(lead ? String(lead.deal_amount_usd) : '0');
  const [dealAmountPkr, setDealAmountPkr] = useState(lead ? String(lead.deal_amount_pkr) : '0');
  const [receivedAmountUsd, setReceivedAmountUsd] = useState(lead ? String(lead.received_amount_usd) : '0');
  const [receivedAmountPkr, setReceivedAmountPkr] = useState(lead ? String(lead.received_amount_pkr) : '0');
  const [status, setStatus] = useState<'pending' | 'partially_paid' | 'paid' | 'cancelled'>(
    lead?.status || 'pending'
  );

  // Auto calculate status based on payment comparison if not cancelled
  const handleAmountChange = (
    type: 'dealUsd' | 'dealPkr' | 'recUsd' | 'recPkr',
    val: string
  ) => {
    let dUsd = parseFloat(type === 'dealUsd' ? val : dealAmountUsd) || 0;
    let dPkr = parseFloat(type === 'dealPkr' ? val : dealAmountPkr) || 0;
    let rUsd = parseFloat(type === 'recUsd' ? val : receivedAmountUsd) || 0;
    let rPkr = parseFloat(type === 'recPkr' ? val : receivedAmountPkr) || 0;

    if (type === 'dealUsd') setDealAmountUsd(val);
    if (type === 'dealPkr') setDealAmountPkr(val);
    if (type === 'recUsd') setReceivedAmountUsd(val);
    if (type === 'recPkr') setReceivedAmountPkr(val);

    if (status !== 'cancelled') {
      const isUsdMode = currency === 'USD';
      const dealVal = isUsdMode ? dUsd : dPkr;
      const recVal = isUsdMode ? rUsd : rPkr;

      if (recVal >= dealVal && dealVal > 0) {
        setStatus('paid');
      } else if (recVal > 0) {
        setStatus('partially_paid');
      } else {
        setStatus('pending');
      }
    }
  };

  const remainingUsd = (parseFloat(dealAmountUsd) || 0) - (parseFloat(receivedAmountUsd) || 0);
  const remainingPkr = (parseFloat(dealAmountPkr) || 0) - (parseFloat(receivedAmountPkr) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !leadTitle.trim()) {
      toast.error('Client Name and Lead Title are required.');
      return;
    }

    setLoading(true);
    const payload = {
      date,
      client_name: clientName.trim(),
      lead_title: leadTitle.trim(),
      lead_details: leadDetails.trim() || null,
      currency,
      deal_amount_usd: parseFloat(dealAmountUsd) || 0,
      deal_amount_pkr: parseFloat(dealAmountPkr) || 0,
      received_amount_usd: parseFloat(receivedAmountUsd) || 0,
      received_amount_pkr: parseFloat(receivedAmountPkr) || 0,
      status,
    };

    try {
      if (isEditing && lead?.id) {
        await updateSalesLead(lead.id, payload);
        await createAuditLog({
          transactionId: lead.id,
          action: 'UPDATE',
          itemName: `Sales Lead: ${payload.lead_title}`,
          details: `Updated sales lead for client ${payload.client_name}. Total: Rs ${payload.deal_amount_pkr} / $${payload.deal_amount_usd}, Received: Rs ${payload.received_amount_pkr} / $${payload.received_amount_usd} (${payload.status})`,
        });
        toast.success('Sales lead updated successfully.');
      } else {
        const created = await createSalesLead(payload);
        await createAuditLog({
          transactionId: created?.id,
          action: 'CREATE',
          itemName: `Sales Lead: ${payload.lead_title}`,
          details: `Created new sales lead for client ${payload.client_name}. Total: Rs ${payload.deal_amount_pkr} / $${payload.deal_amount_usd}, Received: Rs ${payload.received_amount_pkr} / $${payload.received_amount_usd}`,
        });
        toast.success('Sales lead recorded successfully.');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error;
      toast.error(error.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-[95vw] sm:max-w-[550px] bg-white border border-slate-200 shadow-xl rounded-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Client Sales Lead' : 'Record New Sales Lead'}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Track leads given to clients, deal values, and received payments.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="lead-date">Lead Date</Label>
              <Input
                id="lead-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-slate-200 focus-visible:ring-slate-900 w-full"
              />
            </div>

            {/* Client Name */}
            <div className="space-y-1.5">
              <Label htmlFor="client-name">Client / Partner Name</Label>
              <Input
                id="client-name"
                type="text"
                required
                placeholder="e.g. Client Alpha, AZ Partner"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="border-slate-200 focus-visible:ring-slate-900"
              />
            </div>
          </div>

          {/* Lead Title */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-title">Lead Title / Project Name</Label>
            <Input
              id="lead-title"
              type="text"
              required
              placeholder="e.g. E-commerce Website Lead, Mobile App Prospect"
              value={leadTitle}
              onChange={(e) => setLeadTitle(e.target.value)}
              className="border-slate-200 focus-visible:ring-slate-900"
            />
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <Label htmlFor="lead-details">Notes / Prospect Contact Info</Label>
            <Input
              id="lead-details"
              type="text"
              placeholder="e.g. Client phone: 0300-XXXXXXX, 15% agreed commission"
              value={leadDetails}
              onChange={(e) => setLeadDetails(e.target.value)}
              className="border-slate-200 focus-visible:ring-slate-900"
            />
          </div>

          {/* Currency & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lead-currency">Primary Currency</Label>
              <Select value={currency} onValueChange={(val) => setCurrency((val as 'USD' | 'PKR') || 'PKR')}>
                <SelectTrigger id="lead-currency" className="border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR (Rs)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-status">Payment Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as any)}>
                <SelectTrigger id="lead-status" className="border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Amounts Breakdown */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Deal Value vs Received Payments
            </h4>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              {/* Total Agreed Deal */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Total Agreed Deal Amount</Label>
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount in Rs"
                    value={dealAmountPkr}
                    onChange={(e) => handleAmountChange('dealPkr', e.target.value)}
                    className="h-8 text-xs border-slate-200 bg-white"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount in $"
                    value={dealAmountUsd}
                    onChange={(e) => handleAmountChange('dealUsd', e.target.value)}
                    className="h-8 text-xs border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Amount Received */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-emerald-700">Amount Paid by Client</Label>
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Received Rs"
                    value={receivedAmountPkr}
                    onChange={(e) => handleAmountChange('recPkr', e.target.value)}
                    className="h-8 text-xs border-slate-200 bg-white"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Received $"
                    value={receivedAmountUsd}
                    onChange={(e) => handleAmountChange('recUsd', e.target.value)}
                    className="h-8 text-xs border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Remaining Due Calculation Badge */}
            <div className="flex items-center justify-between p-2.5 bg-amber-50/80 border border-amber-200 rounded-md text-xs">
              <span className="font-semibold text-amber-800">Remaining Balance Due:</span>
              <span className="font-bold text-amber-900">
                Rs {new Intl.NumberFormat('en-PK').format(Math.max(0, remainingPkr))} / ${new Intl.NumberFormat('en-US').format(Math.max(0, remainingUsd))}
              </span>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-slate-200">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Record Sales Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
