import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import client from "../../api/client";
import StatCard from "../StatCard";
import { formatRupiah, formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import ReimbursementConfirmModal from "../ReimbursementConfirmModal";

export default function Ringkasan() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAccountId, setOpenAccountId] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [confirmingTx, setConfirmingTx] = useState(null);
  const [notice, setNotice] = useState(null);

  async function load() {
    const [summaryRes, txRes, pendingRes] = await Promise.all([
      client.get("/dashboard/summary"),
      client.get("/transactions"),
      client.get("/transactions", { params: { pending_reimbursement: "true" } }),
    ]);
    setSummary(summaryRes.data);
    setRecent(txRes.data.slice(0, 5));
    setPending(pendingRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

  async function handleToggleAccount(userId) {
    if (openAccountId === userId) {
      setOpenAccountId(null);
      return;
    }
    setOpenAccountId(userId);
    if (!accounts[userId]) {
      const { data } = await client.get(`/members/${userId}/bank-account`);
      setAccounts((prev) => ({ ...prev, [userId]: data }));
    }
  }

  async function handleCopyAccount(userId, accountNumber) {
    try {
      await navigator.clipboard.writeText(accountNumber);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = accountNumber;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (loading || !summary) {
    return <p className="text-sm text-neutral-400 py-10 text-center">Memuat data...</p>;
  }

  const maxKategori = Math.max(...summary.pengeluaran_per_kategori.map((k) => k.jumlah), 1);

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo Saat Ini" value={formatRupiah(summary.saldo)} />
        <StatCard
          label="Total Pemasukan"
          value={formatRupiah(summary.total_pemasukan)}
          hint={`${summary.jumlah_transaksi_masuk} transaksi`}
          hintColor="text-emerald-600"
        />
        <StatCard
          label="Total Pengeluaran"
          value={formatRupiah(summary.total_pengeluaran)}
          hint={`${summary.jumlah_transaksi_keluar} transaksi`}
          hintColor="text-red-500"
        />
        <StatCard label="Jumlah Anggota" value={summary.jumlah_anggota} hint="aktif" />
      </div>

      {pending.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium tracking-wide text-amber-700 uppercase">
              Menunggu Penggantian ke Anggota
            </p>
            <span className="text-sm font-num font-medium text-amber-700">
              {formatRupiah(summary.pending_penggantian_total)} · {pending.length} transaksi
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((t) => {
              const account = accounts[t.user.id];
              const isOpen = openAccountId === t.user.id;
              return (
                <div key={t.id} className="bg-white rounded-lg p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 break-words">{t.description}</p>
                      <p className="text-xs text-neutral-400">
                        Dibayar duluan oleh {t.user.name} · {formatDate(t.date)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="text-sm font-num font-medium text-neutral-900 whitespace-nowrap">
                        {formatRupiah(t.amount)}
                      </span>
                      {user.role === "bendahara" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAccount(t.user.id)}
                            className="border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-medium rounded-lg px-3 py-1.5 whitespace-nowrap"
                          >
                            Lihat Rekening
                          </button>
                          <button
                            onClick={() => setConfirmingTx(t)}
                            className="bg-brand hover:bg-brand-dark text-white text-xs font-medium rounded-lg px-3 py-1.5 whitespace-nowrap"
                          >
                            Sudah Saya Bayar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      {!account && <p className="text-xs text-neutral-400">Memuat rekening...</p>}
                      {account && !account.account_number && (
                        <p className="text-xs text-neutral-400">
                          {t.user.name} belum mengisi data rekening.
                        </p>
                      )}
                      {account && account.account_number && (
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-xs text-neutral-400">
                              {account.bank_name} · a.n. {account.account_holder}
                            </p>
                            <p className="text-sm font-num font-medium text-neutral-900">
                              {account.account_number}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyAccount(t.user.id, account.account_number)}
                            className="border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-medium rounded-lg px-3 py-1.5 whitespace-nowrap"
                          >
                            {copiedId === t.user.id ? "Tersalin!" : "Salin"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border border-neutral-200 rounded-xl p-5">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase mb-4">
            Arus Kas Bulanan
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={summary.arus_kas_bulanan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: "#a3a3a3" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip formatter={(v) => formatRupiah(v)} />
              <Legend
                formatter={(v) => (v === "pemasukan" ? "Pemasukan" : "Pengeluaran")}
                iconType="circle"
              />
              <Bar dataKey="pemasukan" fill="#1e5631" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="pengeluaran" fill="#8fbfa0" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-neutral-200 rounded-xl p-5">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase mb-4">
            Pengeluaran per Kategori
          </p>
          <div className="space-y-3">
            {summary.pengeluaran_per_kategori.map((k) => (
              <div key={k.kategori}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-700">{k.kategori}</span>
                  <span className="font-num text-neutral-900">{formatRupiah(k.jumlah)}</span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${(k.jumlah / maxKategori) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl p-5">
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase mb-4">
          Transaksi Terbaru
        </p>
        <div className="divide-y divide-neutral-100">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                    t.type === "pemasukan"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {t.type === "pemasukan" ? "↗" : "↘"}
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900">{t.description}</p>
                  <p className="text-xs text-neutral-400">
                    {t.user.name} · {formatDate(t.date)}
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-num font-medium ${
                  t.type === "pemasukan" ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {t.type === "pemasukan" ? "+" : "-"}
                {formatRupiah(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

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
