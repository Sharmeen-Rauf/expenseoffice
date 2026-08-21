'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type LedgerType = 'primary' | 'partner';

interface LedgerContextType {
  ledgerType: LedgerType;
  setLedgerType: (type: LedgerType) => void;
  toggleLedger: () => void;
  isPartner: boolean;
  ledgerTitle: string;
  ledgerBadge: string;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

const STORAGE_KEY = 'alara_active_ledger';

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [ledgerType, setLedgerTypeState] = useState<LedgerType>('primary');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'partner' || saved === 'primary') {
        setLedgerTypeState(saved as LedgerType);
      }
    } catch (e) {
      console.error('Failed to read active ledger from localStorage:', e);
    }
  }, []);

  const setLedgerType = (type: LedgerType) => {
    setLedgerTypeState(type);
    try {
      localStorage.setItem(STORAGE_KEY, type);
    } catch (e) {
      console.error('Failed to save active ledger to localStorage:', e);
    }
  };

  const toggleLedger = () => {
    setLedgerType(ledgerType === 'primary' ? 'partner' : 'primary');
  };

  const isPartner = ledgerType === 'partner';
  const ledgerTitle = isPartner ? 'Partner Contribution Ledger' : 'Primary Corporate Ledger';
  const ledgerBadge = isPartner ? 'Partner Ledger' : 'Primary Ledger';

  return (
    <LedgerContext.Provider
      value={{
        ledgerType,
        setLedgerType,
        toggleLedger,
        isPartner,
        ledgerTitle,
        ledgerBadge,
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
