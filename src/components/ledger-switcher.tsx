'use client';

import React from 'react';
import { useLedger } from '@/context/ledger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ArrowLeftRight, Sparkles, Layers, Lock } from 'lucide-react';
import { toast } from 'sonner';

export function LedgerSwitcher() {
  const { ledgerType, toggleLedger, isPartner, isLockedToPartner } = useLedger();

  const handleToggle = () => {
    if (isLockedToPartner) {
      toast.error('Access Restricted: Previous Corporate Ledger is locked for your account.');
      return;
    }
    toggleLedger();
    const nextType = ledgerType === 'primary' ? 'Partner Contribution Ledger' : 'Primary Corporate Ledger';
    toast.success(`Switched active view to: ${nextType}`);
  };

  if (isLockedToPartner) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-bold bg-amber-50 border-amber-200 text-amber-900 shadow-xs">
          <Lock className="h-3.5 w-3.5 text-amber-600" />
          <span>Partner Ledger Active</span>
          <span className="text-[10px] bg-amber-200/80 text-amber-950 px-1.5 py-0.5 rounded font-semibold ml-1">
            Primary Locked
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Active Ledger Status Badge */}
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold bg-slate-50 border-slate-200">
        {isPartner ? (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-900 font-bold">Partner Ledger Active</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            <span className="text-slate-700 font-semibold">Primary Ledger</span>
          </>
        )}
      </div>

      {/* Switcher Button */}
      <Button
        size="sm"
        onClick={handleToggle}
        className={`text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 h-8 ${
          isPartner
            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-400'
            : 'bg-slate-900 hover:bg-slate-800 text-white'
        }`}
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        {isPartner ? (
          <>
            <span>Back to Primary Ledger</span>
          </>
        ) : (
          <>
            <Users className="h-3.5 w-3.5" />
            <span>Switch to Partner Ledger</span>
          </>
        )}
      </Button>
    </div>
  );
}
