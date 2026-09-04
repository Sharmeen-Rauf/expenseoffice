'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';

export type LedgerType = 'primary' | 'partner';

interface LedgerContextType {
  ledgerType: LedgerType;
  setLedgerType: (type: LedgerType) => void;
  toggleLedger: () => void;
  isPartner: boolean;
  ledgerTitle: string;
  ledgerBadge: string;
  isLockedToPartner: boolean;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

const STORAGE_KEY = 'alara_active_ledger';

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const [ledgerTypeState, setLedgerTypeState] = useState<LedgerType>('primary');

  const isLockedToPartner = role === 'partner';
  const effectiveLedgerType = isLockedToPartner ? 'partner' : ledgerTypeState;

  useEffect(() => {
    if (isLockedToPartner) {
      setLedgerTypeState('partner');
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'partner' || saved === 'primary') {
        setLedgerTypeState(saved as LedgerType);
      }
    } catch (e) {
      console.error('Failed to read active ledger from localStorage:', e);
    }
  }, [isLockedToPartner]);

  const setLedgerType = (type: LedgerType) => {
    if (isLockedToPartner && type === 'primary') {
      toast.error('Access Restricted: Primary Corporate Ledger is locked for your account.');
      return;
    }
    setLedgerTypeState(type);
    try {
      localStorage.setItem(STORAGE_KEY, type);
    } catch (e) {
      console.error('Failed to save active ledger to localStorage:', e);
    }
  };

  const toggleLedger = () => {
    if (isLockedToPartner) {
      toast.error('Access Restricted: Previous Corporate Ledger is locked for your account.');
      return;
    }
    setLedgerType(effectiveLedgerType === 'primary' ? 'partner' : 'primary');
  };

  const isPartner = effectiveLedgerType === 'partner';
  const ledgerTitle = isPartner ? 'Partner Contribution Ledger' : 'Primary Corporate Ledger';
  const ledgerBadge = isPartner ? (isLockedToPartner ? 'Partner Ledger (Locked)' : 'Partner Ledger') : 'Primary Ledger';

  return (
    <LedgerContext.Provider
      value={{
        ledgerType: effectiveLedgerType,
        setLedgerType,
        toggleLedger,
        isPartner,
        ledgerTitle,
        ledgerBadge,
        isLockedToPartner,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger() {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
}
