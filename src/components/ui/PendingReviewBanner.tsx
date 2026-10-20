import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface PendingReviewBannerProps {
  /** "movie" or "show" — used in the explanation text. */
  kind: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  approving: boolean;
  rejecting: boolean;
}

/**
 * The "Pending Review" banner with Approve / Reject at the top of a content
 * edit page. Reject opens an inline box for the reason, which is required.
 */
export function PendingReviewBanner({ kind, onApprove, onReject, approving, rejecting }: PendingReviewBannerProps) {
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const busy = approving || rejecting;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-600 dark:bg-amber-900/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-amber-900 dark:text-amber-300">
            ⏳ Pending Review
          </h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
            This {kind} was submitted by the filmmaker and is waiting for your decision.
            Approving will publish it on the platform and notify the filmmaker immediately.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {approving ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setIsRejectOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-slate-800 dark:text-red-400"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      </div>

      {/* Reject reason input — shown inline when Reject is clicked */}
      {isRejectOpen && (
        <div className="mt-4 space-y-3 border-t border-amber-200 pt-4 dark:border-amber-700">
          <label className="block text-sm font-medium text-amber-900 dark:text-amber-300">
            Rejection reason <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this content is being rejected…"
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-amber-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!rejectReason.trim() || rejecting}
              onClick={() => onReject(rejectReason.trim())}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {rejecting ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button
              type="button"
              onClick={() => { setIsRejectOpen(false); setRejectReason(""); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
