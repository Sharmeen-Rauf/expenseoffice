'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth';
import { useLedger } from '@/context/ledger';
import { 
  SalesLead, 
  fetchSalesLeads, 
  deleteSalesLead 
} from '@/lib/sales';
import { createAuditLog } from '@/lib/audit';
import { SalesLeadModal } from '@/components/sales-lead-modal';
import { PaymentInstallmentModal } from '@/components/payment-installment-modal';
import { ClientProfileModal } from '@/components/client-profile-modal';
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
  Filter,
  User,
  CreditCard,
  FileSpreadsheet,
  Layers
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
  const { ledgerType } = useLedger();
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [leadForPayment, setLeadForPayment] = useState<SalesLead | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedClientForProfile, setSelectedClientForProfile] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await fetchSalesLeads(ledgerType);
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
  }, [role, ledgerType]);

  // Unique clients list (defaults to Salma if available)
  const uniqueClients = useMemo(() => {
    const set = new Set(leads.map((l) => l.client_name).filter(Boolean));
    if (!set.has('Salma') && leads.length > 0) {
      set.add('Salma');
    }
    return Array.from(set);
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
        const matchesCycle = (lead.cycle_name || '').toLowerCase().includes(query);
        return matchesClient || matchesTitle || matchesDetails || matchesCycle;
      }
      return true;
    });
  }, [leads, statusFilter, clientFilter, searchTerm]);

  // Calculate totals
  let totalLeadCount = 0;
  let totalDealUSD = 0;
  let totalDealPKR = 0;
  let totalReceivedUSD = 0;
  let totalReceivedPKR = 0;

  filteredLeads.forEach((l) => {
    if (l.status !== 'cancelled') {
      totalLeadCount += Number(l.lead_count || 1);
      totalDealUSD += Number(l.deal_amount_usd || 0);
      totalDealPKR += Number(l.deal_amount_pkr || 0);
      totalReceivedUSD += Number(l.received_amount_usd || 0);
      totalReceivedPKR += Number(l.received_amount_pkr || 0);
    }
  });

  const totalOutstandingUSD = Math.max(0, totalDealUSD - totalReceivedUSD);
  const totalOutstandingPKR = Math.max(0, totalDealPKR - totalReceivedPKR);

  // Active Client Leads for Profile Modal
  const activeClientLeads = useMemo(() => {
    if (!selectedClientForProfile) return [];
    return leads.filter((l) => l.client_name === selectedClientForProfile);
  }, [leads, selectedClientForProfile]);

  const handleEdit = (lead: SalesLead) => {
    setActiveLead(lead);
    setLeadModalOpen(true);
  };

  const handleAddPayment = (lead: SalesLead) => {
    setLeadForPayment(lead);
    setPaymentModalOpen(true);
  };

  const handleOpenClientProfile = (clientName: string) => {
    setSelectedClientForProfile(clientName);
    setProfileModalOpen(true);
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sales & Client Leads Registry</h2>
          <p className="text-sm text-slate-500">Track client lead batches (e.g. Salma 7-day cycles), deal amounts, partial payments, and due balances.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setActiveLead(null);
              setLeadModalOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Record Lead Batch
          </Button>
        </div>
      </div>

      {/* Quick Client Filter Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
          <User className="h-3.5 w-3.5 text-slate-400" /> Client:
        </span>
        <button
          onClick={() => setClientFilter('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 border ${
            clientFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          All Clients
        </button>

        {uniqueClients.map((client) => {
          const isActive = clientFilter === client;
          return (
            <button
              key={client}
              onClick={() => setClientFilter(client)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 border flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{client}</span>
              {client.toLowerCase().includes('salma') && (
                <Badge className="bg-amber-400 text-slate-950 font-bold text-[9px] py-0 px-1">
                  VIP Partner
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Client Specific Hero Card (e.g. Salma Profile Banner) */}
      {clientFilter !== 'all' && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 text-white p-6 rounded-xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">Client Account: {clientFilter}</h3>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                    7-DAY CYCLE PARTNER
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing lead batches, deal settlements, and installment payment history for {clientFilter}.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenClientProfile(clientFilter)}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-slate-800" />
              View {clientFilter}'s Full Account Statement
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-3.5 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Leads Provided</span>
              <span className="text-lg font-bold text-white mt-1 block">{totalLeadCount} Leads</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Deal Volume</span>
              <span className="text-lg font-bold text-white mt-1 block">{formatPKR(totalDealPKR)}</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Cash Received</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">{formatPKR(totalReceivedPKR)}</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 border border-slate-800 rounded-lg">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Remaining Due</span>
              <span className="text-lg font-bold text-amber-400 mt-1 block">{formatPKR(totalOutstandingPKR)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Leads */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Leads Sent</span>
            <Handshake className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalLeadCount} Leads</div>
          <p className="text-[11px] text-slate-400">{filteredLeads.length} batch records</p>
        </div>

        {/* Card 2: Total Agreed Deal Value */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Deal Volume</span>
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
              placeholder="Search client, batch, lead title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200"
            />
          </div>

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
              <TableHead className="text-slate-700 font-bold">Date & Cycle</TableHead>
              <TableHead className="text-slate-700 font-bold">Client / Partner</TableHead>
              <TableHead className="text-slate-700 font-bold">Lead Project Title</TableHead>
              <TableHead className="text-slate-700 font-bold">Leads Count</TableHead>
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
                <TableCell colSpan={9} className="h-32 text-center text-slate-500 text-xs font-medium">
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
                      <span className="text-[10px] text-slate-500 block font-normal">{lead.cycle_name || '7-Day Batch'}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 font-bold text-slate-900 text-xs whitespace-nowrap">
                      <button
                        onClick={() => handleOpenClientProfile(lead.client_name)}
                        className="hover:underline text-left flex items-center gap-1 text-slate-900"
                        title="Click to view full client statement"
                      >
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        {lead.client_name}
                      </button>
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
                    <TableCell className="py-3 px-4 font-semibold text-slate-700 text-xs whitespace-nowrap">
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {lead.lead_count || 1} Leads
                      </Badge>
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
                          size="sm"
                          onClick={() => handleAddPayment(lead)}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                          title="Record Partial Payment"
                        >
                          <CreditCard className="h-3 w-3" />
                          + Installment
                        </Button>
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
      {leadModalOpen && (
        <SalesLeadModal
          isOpen={leadModalOpen}
          onClose={() => setLeadModalOpen(false)}
          onSuccess={loadLeads}
          lead={activeLead}
          key={activeLead?.id || 'new'}
        />
      )}

      {/* Payment Installment Modal */}
      {paymentModalOpen && leadForPayment && (
        <PaymentInstallmentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={loadLeads}
          lead={leadForPayment}
          key={`payment-${leadForPayment.id}`}
        />
      )}

      {/* Client Profile Statement Modal */}
      {profileModalOpen && selectedClientForProfile && (
        <ClientProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          clientName={selectedClientForProfile}
          clientLeads={activeClientLeads}
          onAddPaymentClick={(lead) => {
            setProfileModalOpen(false);
            handleAddPayment(lead);
          }}
          key={`profile-${selectedClientForProfile}`}
        />
      )}
    </div>
  );
}
