import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { monetizationApi } from "../api/monetization";
import { Pagination } from "../components/ui/Pagination";

const LIMIT = 10;

export function MonetizationPage() {
  const [plansTab, setPlansTab] = useState(true);
  const [subsPage, setSubsPage] = useState(1);
  const [tvodPage, setTvodPage] = useState(1);
  const [walletPage, setWalletPage] = useState(1);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["monetization", "plans"],
    queryFn: () => monetizationApi.plans.list(),
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ["monetization", "subscriptions", subsPage],
    queryFn: () =>
      monetizationApi.subscriptions.list({ page: subsPage, limit: LIMIT }),
  });

  const { data: tvodPurchases, isLoading: tvodLoading } = useQuery({
    queryKey: ["monetization", "tvod", tvodPage],
    queryFn: () =>
      monetizationApi.tvod.purchases({ page: tvodPage, limit: LIMIT }),
  });

  const { data: walletTx, isLoading: walletLoading } = useQuery({
    queryKey: ["monetization", "wallet", walletPage],
    queryFn: () =>
      monetizationApi.wallet.transactions({ page: walletPage, limit: LIMIT }),
  });

  const plans = Array.isArray(plansData) ? plansData : [];
  const subs = Array.isArray(subscriptions?.data) ? subscriptions.data : [];
  const tvod = Array.isArray(tvodPurchases?.data) ? tvodPurchases.data : [];
  const wallet = Array.isArray(walletTx?.data) ? walletTx.data : [];
  const subsTotalPages = subscriptions?.totalPages ?? 0;
  const tvodTotalPages = tvodPurchases?.totalPages ?? 0;
  const walletTotalPages = walletTx?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Monetization
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Subscriptions, TVOD, and wallet
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setPlansTab(true)}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            plansTab
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          Plans
        </button>
        <button
          type="button"
          onClick={() => setPlansTab(false)}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            !plansTab
              ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          }`}
        >
          Subscriptions & TVOD & Wallet
        </button>
      </div>

      {plansTab ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Subscription Plans
            </h2>
          </div>
          {plansLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              No plans configured
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {plans.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {p.name}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {p.type} · {p.currency} {p.price}
                    </span>
                    {p.enabled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Enabled
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {p.activeCount ?? 0} active
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Active Subscriptions
              </h2>
            </div>
            {subsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : subs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                No subscriptions
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {subs.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-400">
                      User {s.userId} · Plan {s.planId}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {s.status} · {s.startDate}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {subsTotalPages > 1 && (
              <div className="flex justify-end border-t border-slate-200 p-3 dark:border-slate-700">
                <Pagination
                  page={subsPage}
                  totalPages={subsTotalPages}
                  onPageChange={setSubsPage}
                  disabled={subsLoading}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                TVOD Purchases
              </h2>
            </div>
            {tvodLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : tvod.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                No purchases
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {tvod.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-400">
                      User {t.userId} · Movie {t.movieId}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      ${t.amount.toFixed(2)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {t.createdAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {tvodTotalPages > 1 && (
              <div className="flex justify-end border-t border-slate-200 p-3 dark:border-slate-700">
                <Pagination
                  page={tvodPage}
                  totalPages={tvodTotalPages}
                  onPageChange={setTvodPage}
                  disabled={tvodLoading}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Wallet Transactions
              </h2>
            </div>
            {walletLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : wallet.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                No transactions
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {wallet.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-400">
                      User {w.userId} · {w.type}
                    </span>
                    <span
                      className={
                        w.type === "credit" ? "text-emerald-600" : "text-red-600"
                      }
                    >
                      {w.type === "credit" ? "+" : "-"}${w.amount.toFixed(2)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {w.createdAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {walletTotalPages > 1 && (
              <div className="flex justify-end border-t border-slate-200 p-3 dark:border-slate-700">
                <Pagination
                  page={walletPage}
                  totalPages={walletTotalPages}
                  onPageChange={setWalletPage}
                  disabled={walletLoading}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
