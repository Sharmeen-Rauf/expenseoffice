'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AuditLogEntry } from '@/lib/audit';
import { 
  History, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  User, 
  Calendar,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogModal({ isOpen, onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Table might not exist yet or policy restriction
        console.warn('Could not fetch audit logs:', error.message);
        setLogs([]);
      } else {
        setLogs((data as AuditLogEntry[]) || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditLogs();
    }
  }, [isOpen]);

  const getActionBadge = (action: 'CREATE' | 'UPDATE' | 'DELETE') => {
    switch (action) {
      case 'CREATE':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 flex items-center gap-1 font-bold text-[10px]">
            <PlusCircle className="h-3 w-3" /> ADDED
          </Badge>
        );
      case 'UPDATE':
        return (
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 flex items-center gap-1 font-bold text-[10px]">
            <Edit3 className="h-3 w-3" /> MODIFIED
          </Badge>
        );
      case 'DELETE':
        return (
          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-50 flex items-center gap-1 font-bold text-[10px]">
            <Trash2 className="h-3 w-3" /> DELETED
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] max-w-[95vw] sm:max-w-[650px] bg-white border border-slate-200 shadow-xl rounded-lg max-h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Office Transparency Audit Trail
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time chronological activity log of all ledger additions, edits, and deletions.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="border-slate-200 text-slate-700 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="flex h-48 w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <History className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No Audit Trail Records Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any changes made to transactions (adding, modifying, or deleting entries) will automatically record here for complete team transparency.
              </p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-slate-100">
              {logs.map((log) => {
                const formattedDate = new Date(log.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={log.id} className="pt-3 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action)}
                        <span className="font-bold text-slate-900 text-sm">{log.item_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-normal pl-1 border-l-2 border-slate-200 ml-1 py-0.5">
                      {log.details}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <User className="h-3 w-3 text-slate-400" />
                      <span>Performed by: <strong className="text-slate-700">{log.performed_by_name || log.performed_by_email}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 font-mono text-[10px]">{log.performed_by_email}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
