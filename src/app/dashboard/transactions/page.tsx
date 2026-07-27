'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { createAuditLog } from '@/lib/audit';
import { TransactionsTable } from '@/components/transactions-table';
import { TransactionModal } from '@/components/transaction-modal';
import { AuditLogModal } from '@/components/audit-log-modal';
import { CategoryManagerModal } from '@/components/category-manager-modal';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function TransactionsPage() {
  const { role } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'boss' || role === 'manager') {
      Promise.resolve().then(() => {
        loadTransactions();
      });
    }
  }, [role]);

  const handleEdit = (tx: Transaction) => {
    setActiveTransaction(tx);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const targetTx = transactions.find((t) => t.id === id);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (targetTx) {
        await createAuditLog({
          transactionId: id,
          action: 'DELETE',
          itemName: targetTx.item,
          details: `Deleted ${targetTx.type} transaction originally paid by ${targetTx.paid_by} (Rs ${targetTx.amount_pkr} / $${targetTx.amount_usd})`,
        });
      }

      toast.success('Transaction deleted successfully.');
      loadTransactions();
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error;
      toast.error(error.message || 'Failed to delete transaction.');
    }
  };

  const handleOpenAdd = () => {
    setActiveTransaction(null);
    setModalOpen(true);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ledger Registry</h2>
          <p className="text-sm text-slate-500">Record, filter, search, and manage all income and expense items.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            Audit Trail Log
          </Button>
        </div>
      </div>

      {/* Print-Only Title Header */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">ALARA EXPENSE LEDGER</h1>
        <p className="text-sm text-slate-500 mt-1">Official Financial Records Summary</p>
        <p className="text-xs text-slate-400 mt-0.5">Printed on: {new Date().toLocaleString()}</p>
      </div>

      <TransactionsTable
        data={transactions}
        role={role}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onOpenAddModal={handleOpenAdd}
      />

      {modalOpen && (
        <TransactionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={loadTransactions}
          transaction={activeTransaction}
          key={activeTransaction?.id || 'new'}
        />
      )}

      {auditModalOpen && (
        <AuditLogModal
          isOpen={auditModalOpen}
          onClose={() => setAuditModalOpen(false)}
        />
      )}

      {categoryModalOpen && (
        <CategoryManagerModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          onCategoriesChange={loadTransactions}
        />
      )}
    </div>
  );
}

