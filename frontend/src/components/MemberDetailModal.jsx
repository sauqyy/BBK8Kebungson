import { useEffect, useState } from "react";
import client from "../api/client";
import { formatRupiah, formatDate } from "../utils/format";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";
import { resolveMediaUrl } from "../utils/media";

export default function MemberDetailModal({ member, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("semua");

  useLockBodyScroll();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = { user_id: member.id };
      if (filter !== "semua") params.type = filter;
      const { data } = await client.get("/transactions", { params });
      setTransactions(data);
      setLoading(false);
    }
    load();
  }, [member.id, filter]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center text-sm font-medium shrink-0">
              {member.initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{member.name}</h2>
              <p className="text-xs text-neutral-400">Riwayat transaksi</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-neutral-100">
          <div>
            <p className="text-xs text-neutral-400 uppercase">Disetor</p>
            <p className="text-sm font-num font-medium text-emerald-600">{formatRupiah(member.disetor)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 uppercase">Dikeluarkan</p>
            <p className="text-sm font-num font-medium text-red-500">{formatRupiah(member.dikeluarkan)}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 uppercase">Transaksi</p>
            <p className="text-sm font-num font-medium text-neutral-900">{member.jumlah_transaksi}</p>
          </div>
        </div>

        <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-sm mx-6 mt-4 w-fit">
          {[
            ["semua", "Semua"],
            ["pemasukan", "Pemasukan"],
            ["pengeluaran", "Pengeluaran"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 ${
                filter === value ? "bg-brand text-white" : "bg-white text-neutral-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
          {loading && <p className="text-sm text-neutral-400 text-center py-8">Memuat...</p>}
          {!loading && transactions.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-8">Belum ada transaksi</p>
          )}
          {!loading &&
            transactions.map((t) => (
              <div key={t.id} className="border border-neutral-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 break-words">{t.description}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{formatDate(t.date)}</p>
                  </div>
                  <span
                    className={`text-sm font-num font-medium whitespace-nowrap ${
                      t.type === "pemasukan" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {t.type === "pemasukan" ? "+" : "-"}
                    {formatRupiah(t.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded-md">
                    {t.category}
                  </span>
                  {t.proof_url && (
                    <a
                      href={resolveMediaUrl(t.proof_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand hover:bg-brand/20 text-[10px] font-medium transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Struk
                    </a>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
