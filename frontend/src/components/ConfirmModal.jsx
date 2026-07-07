import { useState } from "react";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";

export default function ConfirmModal({
  title = "Konfirmasi Hapus",
  message,
  confirmLabel = "Hapus",
  onConfirm,
  onClose,
}) {
  useLockBodyScroll();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setError("");
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.response?.data?.error || "Terjadi kesalahan");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 4 21h16a2 2 0 0 0 1.89-2.96L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-neutral-600">{message}</p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 border border-neutral-200 text-neutral-600 text-sm font-medium rounded-lg py-2.5 hover:bg-neutral-50 transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-60"
          >
            {busy ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
