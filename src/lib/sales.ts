import { supabase } from '@/lib/supabase';

export interface SalesLead {
  id?: string;
  date: string;
  client_name: string;
  lead_title: string;
  lead_details: string | null;
  lead_count?: number;
  cycle_name?: string;
  currency: 'USD' | 'PKR';
  deal_amount_usd: number;
  deal_amount_pkr: number;
  received_amount_usd: number;
  received_amount_pkr: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled';
  ledger_type?: 'primary' | 'partner';
  created_by?: string;
  created_at?: string;
}

export interface SalesPayment {
  id?: string;
  lead_id: string;
  payment_date: string;
  amount_pkr: number;
  amount_usd: number;
  payment_notes: string | null;
  created_by?: string;
  created_at?: string;
}

export async function fetchSalesLeads(ledgerType: 'primary' | 'partner' = 'primary'): Promise<SalesLead[]> {
  try {
    const { data, error } = await supabase
      .from('sales_leads')
      .select('*')
      .eq('ledger_type', ledgerType)
      .order('date', { ascending: false });

    if (error) {
      console.warn('Could not fetch sales_leads table:', error.message);
      return [];
    }

    return (data as SalesLead[]) || [];
  } catch (err) {
    console.error('Error fetching sales leads:', err);
    return [];
  }
}

export async function createSalesLead(
  lead: Omit<SalesLead, 'id' | 'created_at'>,
  ledgerType: 'primary' | 'partner' = 'primary'
): Promise<SalesLead> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('sales_leads')
    .insert([{ ...lead, ledger_type: ledgerType, created_by: user?.id }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to create sales lead entry.');
  }

  return data as SalesLead;
}

export async function updateSalesLead(id: string, lead: Partial<SalesLead>): Promise<void> {
  const { error } = await supabase
    .from('sales_leads')
    .update(lead)
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Failed to update sales lead entry.');
  }
}

export async function deleteSalesLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('sales_leads')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Failed to delete sales lead entry.');
  }
}

export async function fetchPaymentsForLead(leadId: string): Promise<SalesPayment[]> {
  try {
    const { data, error } = await supabase
      .from('sales_lead_payments')
      .select('*')
      .eq('lead_id', leadId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.warn('Could not fetch sales_lead_payments table:', error.message);
      return [];
    }

    return (data as SalesPayment[]) || [];
  } catch (err) {
    console.error('Error fetching lead payments:', err);
    return [];
  }
}

export async function addPaymentInstallment(
  leadId: string,
  payment: Omit<SalesPayment, 'id' | 'created_at' | 'lead_id'>,
  currentLead: SalesLead
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Insert payment record
  const { error: pErr } = await supabase
    .from('sales_lead_payments')
    .insert([{ ...payment, lead_id: leadId, created_by: user?.id }]);

  if (pErr) {
    throw new Error(pErr.message || 'Failed to record payment installment.');
  }

  // 2. Update lead received amounts & status
  const newReceivedPkr = Number(currentLead.received_amount_pkr || 0) + Number(payment.amount_pkr || 0);
  const newReceivedUsd = Number(currentLead.received_amount_usd || 0) + Number(payment.amount_usd || 0);

  const dealPkr = Number(currentLead.deal_amount_pkr || 0);
  const dealUsd = Number(currentLead.deal_amount_usd || 0);

  let newStatus: SalesLead['status'] = 'partially_paid';
  if (currentLead.currency === 'USD') {
    if (newReceivedUsd >= dealUsd && dealUsd > 0) newStatus = 'paid';
  } else {
    if (newReceivedPkr >= dealPkr && dealPkr > 0) newStatus = 'paid';
  }

  await updateSalesLead(leadId, {
    received_amount_pkr: newReceivedPkr,
    received_amount_usd: newReceivedUsd,
    status: newStatus,
  });
}
