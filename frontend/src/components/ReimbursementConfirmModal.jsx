import { useState } from "react";
import client from "../api/client";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";
import { formatRupiah, formatDate } from "../utils/format";

export default function ReimbursementConfirmModal({ transaction, onClose, onSaved }) {
  useLockBodyScroll();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const form = new FormData();
      form.append("reimbursed", "true");
      if (file) form.append("bukti_transfer", file);

      const { data } = await client.patch(`/transactions/${transaction.id}/reimbursement`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error || "Gagal menyimpan konfirmasi pembayaran");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">Konfirmasi Pembayaran</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="bg-neutral-50 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-neutral-900 break-words">{transaction.description}</p>
          <p className="text-xs text-neutral-400 mt-0.5">
            Ke {transaction.user.name} · {formatDate(transaction.date)}
          </p>
          <p className="text-sm font-num font-medium text-neutral-900 mt-1">
            {formatRupiah(transaction.amount)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Bukti Transfer (opsional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:text-neutral-600 file:text-sm"
            />
            <p className="text-xs text-neutral-400 mt-1">
              {transaction.user.name} akan mendapat notifikasi email setelah kamu konfirmasi.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Konfirmasi Sudah Dibayar"}
          </button>
        </form>
      </div>
    </div>
  );
}
