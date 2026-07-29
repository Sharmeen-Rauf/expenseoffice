import { supabase } from '@/lib/supabase';

export interface SalesLead {
  id?: string;
  date: string;
  client_name: string;
  lead_title: string;
  lead_details: string | null;
  currency: 'USD' | 'PKR';
  deal_amount_usd: number;
  deal_amount_pkr: number;
  received_amount_usd: number;
  received_amount_pkr: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'cancelled';
  created_by?: string;
  created_at?: string;
}

export async function fetchSalesLeads(): Promise<SalesLead[]> {
  try {
    const { data, error } = await supabase
      .from('sales_leads')
      .select('*')
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

export async function createSalesLead(lead: Omit<SalesLead, 'id' | 'created_at'>): Promise<SalesLead> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('sales_leads')
    .insert([{ ...lead, created_by: user?.id }])
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
