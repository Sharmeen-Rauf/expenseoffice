import { supabase } from '@/lib/supabase';

export interface AuditLogParams {
  transactionId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  itemName: string;
  details: string;
}

export interface AuditLogEntry {
  id: string;
  transaction_id?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performed_by_id?: string;
  performed_by_email: string;
  performed_by_name?: string;
  item_name: string;
  details: string;
  created_at: string;
}

export async function createAuditLog({
  transactionId,
  action,
  itemName,
  details,
}: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optionally fetch profile for full name
    let userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name) {
      userName = profile.full_name;
    }

    const { error } = await supabase.from('audit_logs').insert([{
      transaction_id: transactionId || null,
      action,
      performed_by_id: user.id,
      performed_by_email: user.email || 'unknown',
      performed_by_name: userName,
      item_name: itemName,
      details,
    }]);

    if (error) {
      console.warn('Audit log write warning:', error.message);
    }
  } catch (err) {
    console.warn('Failed to log audit activity:', err);
  }
}
