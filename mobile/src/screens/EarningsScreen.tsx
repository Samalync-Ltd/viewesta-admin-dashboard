import { useEffect, useState } from "react";
import { AppBar } from "../components/layout/AppBar";
import { Card } from "../components/ui/Card";
import { store } from "../data/store";
import type { EarningSummary, Transaction } from "../data/types";
import { TrendingUp, CreditCard, Calendar, ArrowDownRight, ArrowUpRight } from "lucide-react";

export function EarningsScreen() {
  const [summary, setSummary] = useState<EarningSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setSummary(store.getEarningSummary());
    setTransactions(store.getTransactions());
  }, []);

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-surface-600 border-t-primary-500" />
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatAmount = (amount: number) =>
    `${amount >= 0 ? "+" : ""}$${Math.abs(amount).toFixed(2)}`;

  const txIcon = (type: Transaction["type"]) => {
    if (type === "subscription" || type === "tvod" || type === "wallet_debit")
      return <ArrowDownRight className="h-5 w-5 text-red-400" />;
    return <ArrowUpRight className="h-5 w-5 text-emerald-400" />;
  };

  return (
    <div className="min-h-screen bg-black">
      <AppBar title="Earnings" />
      <main className="animate-slide-up px-4 pb-6">
        <Card className="mb-6 p-6">
          <div className="mb-4 flex items-center gap-2 text-surface-400">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium">Total earnings</span>
          </div>
          <p className="text-3xl font-bold text-white">
            ${summary.totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-surface-400">
              This month: <span className="font-semibold text-white">${summary.thisMonth.toFixed(2)}</span>
            </span>
            <span className="text-surface-400">
              Last month: <span className="text-white">${summary.lastMonth.toFixed(2)}</span>
            </span>
          </div>
        </Card>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Card className="p-4">
            <CreditCard className="mb-2 h-5 w-5 text-primary-500" />
            <p className="text-sm text-surface-400">Subscription</p>
            <p className="text-xl font-bold text-white">${summary.subscriptionRevenue.toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <Calendar className="mb-2 h-5 w-5 text-primary-500" />
            <p className="text-sm text-surface-400">TVOD</p>
            <p className="text-xl font-bold text-white">${summary.tvodRevenue.toFixed(2)}</p>
          </Card>
        </div>

        <h2 className="mb-3 text-lg font-semibold text-white">Recent transactions</h2>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <Card className="p-8 text-center text-surface-400">
              No transactions yet
            </Card>
          ) : (
            transactions.map((tx) => (
              <Card key={tx.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-surface-700 p-2">{txIcon(tx.type)}</div>
                  <div>
                    <p className="font-medium text-white">{tx.description}</p>
                    <p className="text-xs text-surface-400">{formatDate(tx.date)}</p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatAmount(tx.amount)}
                </span>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
