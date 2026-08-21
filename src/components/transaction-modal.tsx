'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createAuditLog } from '@/lib/audit';
import { fetchCategories, CategoryItem } from '@/lib/categories';
import { useLedger } from '@/context/ledger';
import { CategoryManagerModal } from '@/components/category-manager-modal';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
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

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null; // If editing, pass transaction data
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: TransactionModalProps) {
  const { role } = useAuth();
  const { ledgerType } = useLedger();
  const isEditing = !!transaction?.id;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // Form states initialized directly from props (reset on remount via key)
  const [date, setDate] = useState(transaction?.date || new Date().toLocaleDateString('en-CA'));
  const [item, setItem] = useState(transaction?.item || '');
  const [detail, setDetail] = useState(transaction?.detail || '');
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || 'expense');
  const [currency, setCurrency] = useState<'USD' | 'PKR'>(transaction?.currency || 'PKR');
  const [amountUsd, setAmountUsd] = useState(transaction ? String(transaction.amount_usd) : '0');
  const [amountPkr, setAmountPkr] = useState(transaction ? String(transaction.amount_pkr) : '0');
  const [paidBy, setPaidBy] = useState(transaction?.paid_by || '');
  const [category, setCategory] = useState<string>(transaction?.category || 'Office');

  const loadCategories = async () => {
    try {
      const list = await fetchCategories();
      setCategories(list);
      if (!category && list.length > 0) {
        setCategory(list[0].name);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

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
      category: category || 'Office',
      ledger_type: ledgerType,
    };

    try {
      if (isEditing && transaction?.id) {
        // Update
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', transaction.id);

        if (error) throw error;

        // Log audit
        const changeDetails = `Updated details: Paid by ${payload.paid_by}, Category: ${payload.category}, Amounts: Rs ${payload.amount_pkr} / $${payload.amount_usd}`;
        await createAuditLog({
          transactionId: transaction.id,
          action: 'UPDATE',
          itemName: payload.item,
          details: changeDetails,
          ledgerType: ledgerType,
        });

        toast.success('Transaction updated successfully.');
      } else {
        // Create
        const { data: { user } } = await supabase.auth.getUser();
        const { data: createdData, error } = await supabase
          .from('transactions')
          .insert([{ ...payload, created_by: user?.id }])
          .select()
          .single();

        if (error) throw error;

        // Log audit
        const newDetails = `Type: ${payload.type.toUpperCase()}, Currency: ${payload.currency}, Amounts: Rs ${payload.amount_pkr} / $${payload.amount_usd}, Paid by: ${payload.paid_by}`;
        await createAuditLog({
          transactionId: createdData?.id,
          action: 'CREATE',
          itemName: payload.item,
          details: newDetails,
          ledgerType: ledgerType,
        });

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
      <DialogContent className="w-[92vw] max-w-[95vw] sm:max-w-[520px] bg-white border border-slate-200 shadow-xl rounded-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="category">Category</Label>
                {role === 'boss' && (
                  <button
                    type="button"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="text-[11px] font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-0.5 hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Category
                  </button>
                )}
              </div>
              <Select value={category} onValueChange={(val) => setCategory(val || 'Office')}>
                <SelectTrigger id="category" className="border-slate-200 bg-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id || cat.name} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  {/* Ensure current category is listed if custom */}
                  {category && !categories.some((c) => c.name === category) && (
                    <SelectItem value={category}>{category}</SelectItem>
                  )}
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

        {/* Category Manager Modal */}
        {categoryManagerOpen && (
          <CategoryManagerModal
            isOpen={categoryManagerOpen}
            onClose={() => setCategoryManagerOpen(false)}
            onCategoriesChange={loadCategories}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
