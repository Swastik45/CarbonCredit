'use client';

import React, { useEffect, useState } from 'react';
import { Award, FileText, ArrowUpRight, ArrowDownLeft, ShieldCheck, Download, RefreshCw } from 'lucide-react';

export type TransactionItem = {
  id: string;
  amount: number;
  totalPrice: number;
  type: 'PURCHASE' | 'RETIREMENT' | 'TRANSFER';
  certificateUrl?: string | null;
  createdAt: string;
  plantation?: {
    title: string;
    locationName: string;
  } | null;
};

export default function TransactionLedger() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLedger() {
      try {
        const res = await fetch('/api/business/purchases');
        if (res.ok) {
          const data = await res.json();
          setPurchases(data.purchases || []);
        }
      } catch (err) {
        console.error('Failed to load transaction ledger:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLedger();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-carbon-500/20 text-center py-8 text-carbon-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-carbon-400" />
        <span>Loading transaction audit ledger...</span>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-3xl border border-carbon-500/30 space-y-4">
      <div className="flex items-center justify-between border-b border-carbon-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-carbon-950 border border-carbon-500/30 flex items-center justify-center text-carbon-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Carbon Offset Transaction Ledger</h3>
            <p className="text-xs text-carbon-300">Audited Purchases & Issued Digital Certificates</p>
          </div>
        </div>

        <span className="text-xs text-carbon-400 font-mono">
          <strong className="text-emerald-400 font-bold">{purchases.length}</strong> Settled Transactions
        </span>
      </div>

      {/* Ledger Table */}
      <div className="space-y-3">
        {purchases.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-darkbg-900/90 border border-carbon-500/20 flex flex-wrap items-center justify-between gap-4 text-xs hover:border-carbon-500/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{item.plantation?.title || 'Carbon Offset Investment'}</h4>
                <p className="text-[11px] text-carbon-300">
                  {item.plantation?.locationName} • Receipt #{item.receiptNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <div>
                <span className="text-[10px] text-carbon-400 block">CREDITS</span>
                <span className="text-emerald-400 font-bold text-sm">+{item.creditsCount} tCO₂e</span>
              </div>

              <div>
                <span className="text-[10px] text-carbon-400 block">TOTAL PRICE</span>
                <span className="text-white font-bold">${item.totalPrice.toFixed(2)}</span>
              </div>

              <a
                href={`/api/certificates/${item.receiptNumber}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg glass-panel hover:border-carbon-500/50 text-carbon-200 hover:text-white flex items-center gap-1.5 transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5 text-carbon-400" />
                <span>Certificate</span>
              </a>
            </div>
          </div>
        ))}

        {purchases.length === 0 && (
          <div className="py-8 text-center text-carbon-400 text-xs">
            No transactions found in your audit ledger.
          </div>
        )}
      </div>
    </div>
  );
}
