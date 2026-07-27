'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  Download, 
  Printer, 
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

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

interface TransactionsTableProps {
  data: Transaction[];
  role: 'boss' | 'manager' | 'pending' | null;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenAddModal: () => void;
}

export function TransactionsTable({
  data,
  role,
  onEdit,
  onDelete,
  onOpenAddModal,
}: TransactionsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const isBoss = role === 'boss';

  // Excel Export
  const handleExportExcel = () => {
    try {
      const formatted = data.map((tx) => ({
        'Date': tx.date,
        'Item': tx.item,
        'Detail': tx.detail || '',
        'Type': tx.type,
        'Currency': tx.currency,
        'Amount ($)': tx.amount_usd,
        'Amount (Rs)': tx.amount_pkr,
        'Paid By': tx.paid_by,
        'Category': tx.category,
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger Transactions');
      
      // Auto-fit column widths
      const maxLens = Object.keys(formatted[0] || {}).map((key) => {
        const lengths = formatted.map((row) => String((row as Record<string, unknown>)[key] || '').length);
        return Math.max(key.length, ...lengths) + 2;
      });
      worksheet['!cols'] = maxLens.map((w) => ({ wch: w }));

      XLSX.writeFile(workbook, `ExpenseOffice_Ledger_${new Date().toLocaleDateString('en-CA')}.xlsx`);
      toast.success('Successfully exported Ledger to Excel (.xlsx)');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel file.');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Item', 'Detail', 'Type', 'Currency', 'Amount ($)', 'Amount (Rs)', 'Paid By', 'Category'];
      const rows = data.map((tx) => [
        tx.date,
        tx.item,
        tx.detail || '',
        tx.type,
        tx.currency,
        tx.amount_usd,
        tx.amount_pkr,
        tx.paid_by,
        tx.category,
      ]);

      const csvString = [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
      ].join('\r\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ExpenseOffice_Ledger_${new Date().toLocaleDateString('en-CA')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Successfully exported Ledger to CSV');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV file.');
    }
  };

  // Print PDF Trigger
  const handlePrint = () => {
    window.print();
  };

  // Filter logic in-memory before passing to React Table
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Category filter
      if (categoryFilter !== 'all' && row.category !== categoryFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && row.type !== typeFilter) {
        return false;
      }
      // Global search text (Item, Detail, Paid By)
      if (globalFilter.trim()) {
        const query = globalFilter.toLowerCase();
        const matchesItem = row.item.toLowerCase().includes(query);
        const matchesDetail = (row.detail || '').toLowerCase().includes(query);
        const matchesPaidBy = row.paid_by.toLowerCase().includes(query);
        return matchesItem || matchesDetail || matchesPaidBy;
      }
      return true;
    });
  }, [data, categoryFilter, typeFilter, globalFilter]);

  // Column definitions
  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 hover:bg-transparent hover:text-slate-900 font-semibold"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.date}</span>,
      },
      {
        accessorKey: 'item',
        header: 'Item Details',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 leading-none">{row.original.item}</span>
            {row.original.detail && (
              <span className="text-xs text-slate-500 mt-1 leading-normal max-w-xs truncate" title={row.original.detail}>
                {row.original.detail}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <Badge variant="outline" className="font-medium capitalize">{row.original.category}</Badge>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge
            className={`font-semibold capitalize border ${
              row.original.type === 'income'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}
          >
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: 'amount_usd',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 hover:bg-transparent hover:text-slate-900 font-semibold"
          >
            Amount ($)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-bold text-slate-900">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.amount_usd)}
          </span>
        ),
      },
      {
        accessorKey: 'amount_pkr',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="p-0 hover:bg-transparent hover:text-slate-900 font-semibold"
          >
            Amount (Rs)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-600 font-semibold">
            Rs {new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2 }).format(row.original.amount_pkr)}
          </span>
        ),
      },
      {
        accessorKey: 'paid_by',
        header: 'Paid By',
        cell: ({ row }) => <span className="font-medium text-slate-700 uppercase">{row.original.paid_by}</span>,
      },
      {
        id: 'actions',
        header: () => <span className="print:hidden">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(row.original)}
              className="h-8 w-8 border-slate-200 text-slate-600 hover:text-slate-900"
              title="Edit Transaction"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            {isBoss && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                    onDelete(row.original.id);
                  }
                }}
                className="h-8 w-8 border-slate-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                title="Delete Transaction"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [onEdit, onDelete, isBoss]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Control panel (Filters + Add button) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        {/* Left Side: Search + Category/Type filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search item, detail, paid by..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full sm:w-[280px] pl-10 border-slate-200 focus-visible:ring-slate-900 focus-visible:border-slate-900"
            />
          </div>

          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'all')}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Array.from(
                new Set([
                  'Office',
                  'Hardware',
                  'Utilities',
                  'Salaries',
                  'Investment',
                  ...data.map((tx) => tx.category).filter(Boolean),
                ])
              ).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'all')}>
            <SelectTrigger className="w-[120px] bg-white border-slate-200">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Actions (Export + Print + Add Entry) */}
        <div className="flex flex-wrap items-center gap-2">
          {isBoss && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>

          <Button
            size="sm"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium ml-auto"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs print:border-none print:shadow-none">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200 print:bg-slate-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-slate-700 font-bold h-11">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500 font-medium">
                  No records match the active criteria.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Panel */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 print:hidden bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500">
            Showing page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 border-slate-200 text-slate-600 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 border-slate-200 text-slate-600 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
