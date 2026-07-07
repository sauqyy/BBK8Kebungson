import { useEffect, useState } from "react";
import client from "../../api/client";
import { formatRupiah, formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import TambahTransaksiModal from "../TambahTransaksiModal";
import ReimbursementConfirmModal from "../ReimbursementConfirmModal";
import ConfirmModal from "../ConfirmModal";
import Avatar from "../Avatar";
import { TrashIcon, PencilIcon } from "../Icons";

export default function Transaksi() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("semua");
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deletingTx, setDeletingTx] = useState(null);
  const [confirmingTx, setConfirmingTx] = useState(null);
  const [notice, setNotice] = useState(null);
  const [categoryColors, setCategoryColors] = useState({});

  async function loadCategoryColors() {
    const { data } = await client.get("/categories");
    const colors = {};
    data.forEach((c) => {
      colors[`${c.type}:${c.name}`] = c.color;
    });
    setCategoryColors(colors);
  }

  useEffect(() => {
    loadCategoryColors();
    function handleCategoriesUpdated() {
      loadCategoryColors();
      load();
    }
    window.addEventListener("categories-updated", handleCategoriesUpdated);
    return () => window.removeEventListener("categories-updated", handleCategoriesUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function CategoryBadge({ t }) {
    const color = categoryColors[`${t.type}:${t.category}`] || "#6b7280";
    return (
      <span
        className="text-xs px-2 py-1 rounded-md whitespace-nowrap font-medium"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {t.category}
      </span>
    );
  }

  async function load() {
    setLoading(true);
    const params = {};
    if (filter !== "semua") params.type = filter;
    if (search) params.q = search;
    const { data } = await client.get("/transactions", { params });
    setTransactions(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete() {
    await client.delete(`/transactions/${deletingTx.id}`);
    setDeletingTx(null);
    load();
  }

  function handleReimbursementSaved(updatedTx) {
    setConfirmingTx(null);
    const emailResult = updatedTx.email_notification;
    if (emailResult?.success) {
      setNotice({ type: "success", text: `Notifikasi email berhasil dikirim ke ${updatedTx.user.name}.` });
    } else if (emailResult) {
      setNotice({
        type: "error",
        text: `Pembayaran tersimpan, tapi email gagal terkirim: ${emailResult.error}`,
      });
    }
    setTimeout(() => setNotice(null), 6000);
    load();
  }

  function ReimbursementBadge({ t }) {
    if (!t.needs_reimbursement) return null;
    if (t.reimbursed) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-md whitespace-nowrap">
            Sudah diganti
          </span>
          {t.reimbursement_proof_url && (
            <a
              href={t.reimbursement_proof_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand hover:bg-brand/20 text-[10px] font-medium transition-colors whitespace-nowrap"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Transfer
            </a>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-md whitespace-nowrap">
          Belum diganti
        </span>
        {user.role === "bendahara" && (
          <button
            onClick={() => setConfirmingTx(t)}
            className="text-xs text-brand underline whitespace-nowrap"
          >
            Tandai dibayar
          </button>
        )}
      </div>
    );
  }

  async function handleExport(format) {
    const res = await client.get(`/reports/export/${format}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "pdf" ? "laporan-kas-kkn.pdf" : "laporan-kas-kkn.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari transaksi, nama, atau kategori..."
          className="w-full sm:max-w-sm rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-sm">
            {[
              ["semua", "Semua"],
              ["pemasukan", "Pemasukan"],
              ["pengeluaran", "Pengeluaran"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-2 ${
                  filter === value ? "bg-brand text-white" : "bg-white text-neutral-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 whitespace-nowrap"
          >
            + Tambah
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => handleExport("excel")}
          className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-lg px-3 py-1.5"
        >
          Export Excel
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="text-xs text-neutral-500 hover:text-neutral-900 border border-neutral-200 rounded-lg px-3 py-1.5"
        >
          Export PDF
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-400 py-10 text-center">Memuat...</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-sm text-neutral-400 py-10 text-center">Tidak ada transaksi</p>
      )}

      {!loading && transactions.length > 0 && (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 sm:hidden">
            {transactions.map((t) => (
              <div key={t.id} className="border border-neutral-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 break-words">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Avatar url={t.user.avatar_url} initials={t.user.initials} size="xs" />
                      <p className="text-xs text-neutral-400">
                        {t.user.name} · {formatDate(t.date)}
                      </p>
                    </div>
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
                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge t={t} />
                    {t.proof_url && (
                      <a
                        href={t.proof_url}
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
                  <div className="flex items-center gap-3">
                    {user.role === "bendahara" && (
                      <button
                        onClick={() => setEditingTx(t)}
                        className="text-neutral-300 hover:text-brand"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                    )}
                    {(user.role === "bendahara" || user.id === t.user.id) && (
                      <button
                        onClick={() => setDeletingTx(t)}
                        className="text-neutral-300 hover:text-red-500"
                        title="Hapus"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
                {t.needs_reimbursement && (
                  <div className="mt-2">
                    <ReimbursementBadge t={t} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop / tablet: table */}
          <div className="hidden sm:block border border-neutral-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-400 uppercase border-b border-neutral-200">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Oleh</th>
                  <th className="px-4 py-3 font-medium">Penggantian</th>
                  <th className="px-4 py-3 font-medium text-right">Jumlah</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 text-neutral-900">
                      {t.description}
                      {t.proof_url && (
                        <a
                          href={t.proof_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-brand/10 text-brand hover:bg-brand/20 text-[10px] font-medium transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Struk
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge t={t} />
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      <div className="flex items-center gap-2">
                        <Avatar url={t.user.avatar_url} initials={t.user.initials} size="sm" />
                        {t.user.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ReimbursementBadge t={t} />
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-num font-medium whitespace-nowrap ${
                        t.type === "pemasukan" ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {t.type === "pemasukan" ? "+" : "-"}
                      {formatRupiah(t.amount)}
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        {user.role === "bendahara" && (
                          <button
                            onClick={() => setEditingTx(t)}
                            className="text-neutral-300 hover:text-brand"
                            title="Edit"
                          >
                            <PencilIcon />
                          </button>
                        )}
                        {(user.role === "bendahara" || user.id === t.user.id) && (
                          <button
                            onClick={() => setDeletingTx(t)}
                            className="text-neutral-300 hover:text-red-500"
                            title="Hapus"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <TambahTransaksiModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
            loadCategoryColors();
          }}
        />
      )}

      {editingTx && (
        <TambahTransaksiModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null);
            load();
            loadCategoryColors();
          }}
        />
      )}

      {deletingTx && (
        <ConfirmModal
          title="Hapus Transaksi"
          message={`Yakin ingin menghapus transaksi "${deletingTx.description}"? Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={handleDelete}
          onClose={() => setDeletingTx(null)}
        />
      )}

      {confirmingTx && (
        <ReimbursementConfirmModal
          transaction={confirmingTx}
          onClose={() => setConfirmingTx(null)}
          onSaved={handleReimbursementSaved}
        />
      )}
    </div>
  );
}
