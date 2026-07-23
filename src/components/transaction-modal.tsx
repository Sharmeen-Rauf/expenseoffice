'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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

interface Transaction {
  id?: string;
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

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null; // If editing, pass transaction data
}

type CategoryType = 'Office' | 'Hardware' | 'Utilities' | 'Salaries' | 'Investment';

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: TransactionModalProps) {
  const isEditing = !!transaction?.id;
  const [loading, setLoading] = useState(false);

  // Form states initialized directly from props (reset on remount via key)
  const [date, setDate] = useState(transaction?.date || new Date().toLocaleDateString('en-CA'));
  const [item, setItem] = useState(transaction?.item || '');
  const [detail, setDetail] = useState(transaction?.detail || '');
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || 'expense');
  const [currency, setCurrency] = useState<'USD' | 'PKR'>(transaction?.currency || 'USD');
  const [amountUsd, setAmountUsd] = useState(transaction ? String(transaction.amount_usd) : '0');
  const [amountPkr, setAmountPkr] = useState(transaction ? String(transaction.amount_pkr) : '0');
  const [paidBy, setPaidBy] = useState(transaction?.paid_by || '');
  const [category, setCategory] = useState<CategoryType>(transaction?.category || 'Office');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !paidBy.trim()) {
      toast.error('Item name and Paid By fields are required.');
      return;
    }

    setLoading(true);
    const payload = {
      date,
      item: item.trim(),
      detail: detail.trim() || null,
      type,
      currency,
      amount_usd: parseFloat(amountUsd) || 0,
      amount_pkr: parseFloat(amountPkr) || 0,
      paid_by: paidBy.trim(),
      category,
    };

    try {
      if (isEditing && transaction?.id) {
        // Update
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', transaction.id);

        if (error) throw error;
        toast.success('Transaction updated successfully.');
      } else {
        // Create
        // Get user session to track who created it
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('transactions')
          .insert([{ ...payload, created_by: user?.id }]);

        if (error) throw error;
        toast.success('Transaction added successfully.');
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
      <DialogContent className="sm:max-w-[500px] bg-white border border-slate-200 shadow-lg rounded-lg">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEditing ? 'Edit Transaction' : 'Record New Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">Transaction Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-900 w-full"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={type} onValueChange={(val) => setType((val as 'income' | 'expense') || 'expense')}>
                <SelectTrigger id="type" className="border-slate-200 bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item */}
          <div className="space-y-1.5">
            <Label htmlFor="item">Item Name</Label>
            <Input
              id="item"
              type="text"
              required
              placeholder="e.g. Office Rent, Cloud Server Subscription"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-950"
            />
          </div>

          {/* Detail */}
          <div className="space-y-1.5">
            <Label htmlFor="detail">Details / Description</Label>
            <Input
              id="detail"
              type="text"
              placeholder="e.g. Server hosting for July, Q3 rent payment"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory((val as CategoryType) || 'Office')}>
                <SelectTrigger id="category" className="border-slate-200 bg-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paid By */}
            <div className="space-y-1.5">
              <Label htmlFor="paid-by">Paid By (Initials/Name)</Label>
              <Input
                id="paid-by"
                type="text"
                required
                placeholder="e.g. AZ, Manager"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-950"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 my-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dual Currency Support</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Primary:</span>
                <Select value={currency} onValueChange={(val) => setCurrency((val as 'USD' | 'PKR') || 'USD')}>
                  <SelectTrigger className="w-[80px] h-7 text-xs border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="PKR">PKR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Dollar Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount-usd" className="flex items-center gap-1 text-xs">
                  <span>Amount in USD ($)</span>
                  {currency === 'USD' && <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />}
                </Label>
                <Input
                  id="amount-usd"
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  className="border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-950"
                />
              </div>

              {/* Rupee Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount-pkr" className="flex items-center gap-1 text-xs">
                  <span>Amount in PKR (Rs)</span>
                  {currency === 'PKR' && <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />}
                </Label>
                <Input
                  id="amount-pkr"
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={amountPkr}
                  onChange={(e) => setAmountPkr(e.target.value)}
                  className="border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-950"
                />
              </div>
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
                'Add Transaction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
