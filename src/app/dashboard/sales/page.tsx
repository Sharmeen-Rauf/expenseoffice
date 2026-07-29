'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth';
import { 
  SalesLead, 
  fetchSalesLeads, 
  deleteSalesLead 
} from '@/lib/sales';
import { createAuditLog } from '@/lib/audit';
import { SalesLeadModal } from '@/components/sales-lead-modal';
import { toast } from 'sonner';
import { 
  Briefcase, 
  Plus, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  Loader2, 
  Handshake,
  TrendingUp,
  Filter
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

export default function SalesLeadsPage() {
  const { role } = useAuth();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await fetchSalesLeads();
      setLeads(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sales leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'boss' || role === 'manager') {
      loadLeads();
    }
  }, [role]);

  // Unique clients list
  const uniqueClients = useMemo(() => {
    return Array.from(new Set(leads.map((l) => l.client_name).filter(Boolean)));
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (clientFilter !== 'all' && lead.client_name !== clientFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesClient = lead.client_name.toLowerCase().includes(query);
        const matchesTitle = lead.lead_title.toLowerCase().includes(query);
        const matchesDetails = (lead.lead_details || '').toLowerCase().includes(query);
        return matchesClient || matchesTitle || matchesDetails;
      }
      return true;
    });
  }, [leads, statusFilter, clientFilter, searchTerm]);

  // Calculate totals
  let totalDealUSD = 0;
  let totalDealPKR = 0;
  let totalReceivedUSD = 0;
  let totalReceivedPKR = 0;

  filteredLeads.forEach((l) => {
    if (l.status !== 'cancelled') {
      totalDealUSD += Number(l.deal_amount_usd || 0);
      totalDealPKR += Number(l.deal_amount_pkr || 0);
      totalReceivedUSD += Number(l.received_amount_usd || 0);
      totalReceivedPKR += Number(l.received_amount_pkr || 0);
    }
  });

  const totalOutstandingUSD = Math.max(0, totalDealUSD - totalReceivedUSD);
  const totalOutstandingPKR = Math.max(0, totalDealPKR - totalReceivedPKR);

  const handleEdit = (lead: SalesLead) => {
    setActiveLead(lead);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = leads.find((l) => l.id === id);
    if (!confirm('Are you sure you want to delete this sales lead record?')) return;

    try {
      await deleteSalesLead(id);
      if (target) {
        await createAuditLog({
          transactionId: id,
          action: 'DELETE',
          itemName: `Sales Lead: ${target.lead_title}`,
          details: `Deleted lead entry for client ${target.client_name} (Deal: Rs ${target.deal_amount_pkr} / $${target.deal_amount_usd})`,
        });
      }
      toast.success('Sales lead record deleted.');
      loadLeads();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || 'Failed to delete sales lead.');
    }
  };

  const formatPKR = (val: number) =>
    'Rs ' + new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(val);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const getStatusBadge = (status: SalesLead['status']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
            Fully Paid
          </Badge>
        );
      case 'partially_paid':
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
            Partially Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px]">
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px]">
            Cancelled
          </Badge>
        );
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sales & Client Leads Tracker</h2>
          <p className="text-sm text-slate-500">Record leads given to clients, deal volume, received cash, and outstanding dues.</p>
        </div>

        <Button
          onClick={() => {
            setActiveLead(null);
            setModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Record Sales Lead
        </Button>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Leads */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Leads Given</span>
            <Handshake className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{filteredLeads.length}</div>
          <p className="text-[11px] text-slate-400">Active client entries</p>
        </div>

        {/* Card 2: Total Agreed Deal Value */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Deal Value</span>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatPKR(totalDealPKR)}</div>
          <div className="text-xs font-semibold text-slate-500">{formatUSD(totalDealUSD)}</div>
        </div>

        {/* Card 3: Cash Received */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-2 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Received Cash</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{formatPKR(totalReceivedPKR)}</div>
          <div className="text-xs font-semibold text-emerald-600">{formatUSD(totalReceivedUSD)}</div>
        </div>

        {/* Card 4: Outstanding Dues */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-2 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Outstanding Receivable</span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-950">{formatPKR(totalOutstandingPKR)}</div>
          <div className="text-xs font-semibold text-amber-700">{formatUSD(totalOutstandingUSD)}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 border border-slate-200 rounded-lg shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search client, lead title, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200"
            />
          </div>

          <Select value={clientFilter} onValueChange={(val) => setClientFilter(val || 'all')}>
            <SelectTrigger className="w-[150px] h-9 text-xs border-slate-200 bg-white">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
            <SelectTrigger className="w-[130px] h-9 text-xs border-slate-200 bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Fully Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline" className="text-xs font-medium text-slate-500 self-start sm:self-auto">
          {filteredLeads.length} Lead Records
        </Badge>
      </div>

      {/* Main Sales Leads Registry Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow>
              <TableHead className="text-slate-700 font-bold">Date</TableHead>
              <TableHead className="text-slate-700 font-bold">Client / Partner</TableHead>
              <TableHead className="text-slate-700 font-bold">Lead Project Title</TableHead>
              <TableHead className="text-slate-700 font-bold">Agreed Deal</TableHead>
              <TableHead className="text-slate-700 font-bold">Paid by Client</TableHead>
              <TableHead className="text-slate-700 font-bold">Balance Due</TableHead>
              <TableHead className="text-slate-700 font-bold">Status</TableHead>
              <TableHead className="text-slate-700 font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-slate-500 text-xs font-medium">
                  No sales lead records match your search criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => {
                const remPkr = Math.max(0, lead.deal_amount_pkr - lead.received_amount_pkr);
                const remUsd = Math.max(0, lead.deal_amount_usd - lead.received_amount_usd);

                return (
                  <TableRow key={lead.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                    <TableCell className="py-3 px-4 font-medium text-slate-900 text-xs whitespace-nowrap">
                      {lead.date}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                      {lead.client_name}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs">{lead.lead_title}</span>
                        {lead.lead_details && (
                          <span className="text-[11px] text-slate-500 truncate max-w-xs" title={lead.lead_details}>
                            {lead.lead_details}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                      {formatPKR(lead.deal_amount_pkr)} <span className="text-slate-400 font-normal">/</span> {formatUSD(lead.deal_amount_usd)}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-emerald-700 text-xs whitespace-nowrap">
                      {formatPKR(lead.received_amount_pkr)} <span className="text-emerald-400 font-normal">/</span> {formatUSD(lead.received_amount_usd)}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-amber-800 text-xs whitespace-nowrap">
                      {formatPKR(remPkr)} <span className="text-amber-400 font-normal">/</span> {formatUSD(remUsd)}
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(lead.status)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(lead)}
                          className="h-7 w-7 border-slate-200 text-slate-600 hover:text-slate-900"
                          title="Edit Sales Lead"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {role === 'boss' && lead.id && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(lead.id!)}
                            className="h-7 w-7 border-slate-200 text-rose-600 hover:bg-rose-50"
                            title="Delete Sales Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sales Lead Modal */}
      {modalOpen && (
        <SalesLeadModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={loadLeads}
          lead={activeLead}
          key={activeLead?.id || 'new'}
        />
      )}
    </div>
  );
}
