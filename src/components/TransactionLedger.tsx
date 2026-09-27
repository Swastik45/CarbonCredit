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
    <div className="p-5 sm:p-6 rounded-xl border border-white/[0.08] bg-[#101412]/80 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Carbon Offset Transaction Ledger</h3>
            <p className="text-xs text-neutral-400">Audited Purchases & Issued Digital Certificates</p>
          </div>
        </div>

        <span className="text-xs text-neutral-400 font-mono">
          <strong className="text-white font-semibold">{purchases.length}</strong> Settled Transactions
        </span>
      </div>

      {/* Ledger Table */}
      <div className="space-y-3">
        {purchases.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-black/30 border border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-300 shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-white text-xs">{item.plantation?.title || 'Carbon Offset Investment'}</h4>
                <p className="text-[11px] text-neutral-400">
                  {item.plantation?.locationName} • Receipt #{item.receiptNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <div>
                <span className="text-[10px] text-neutral-500 block">CREDITS</span>
                <span className="text-white font-semibold text-xs">+{item.creditsCount} tCO₂e</span>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 block">TOTAL PRICE</span>
                <span className="text-white font-semibold text-xs">${item.totalPrice.toFixed(2)}</span>
              </div>

              <a
                href={`/api/certificates/${item.receiptNumber}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-neutral-300 hover:text-white flex items-center gap-1.5 transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
                <span>Certificate</span>
              </a>
            </div>
          </div>
        ))}

        {purchases.length === 0 && (
          <div className="py-8 text-center text-neutral-500 text-xs">
            No transactions found in your audit ledger.
          </div>
        )}
      </div>
    </div>
  );
}
