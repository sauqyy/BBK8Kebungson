import { useEffect, useState } from "react";
import client from "../api/client";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";
import { useAuth } from "../context/AuthContext";
import { formatWithThousands, stripThousands } from "../utils/format";
import AddCategoryModal from "./AddCategoryModal";
import { resolveMediaUrl } from "../utils/media";

const ADD_NEW = "__add_new__";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function TambahTransaksiModal({ onClose, onSaved, transaction }) {
  useLockBodyScroll();
  const { user } = useAuth();
  const isEdit = Boolean(transaction);
  const [type, setType] = useState(transaction?.type || "pemasukan");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [category, setCategory] = useState(transaction?.category || "");
  const [date, setDate] = useState(transaction?.date || todayStr());
  const [file, setFile] = useState(null);
  const [paidWith, setPaidWith] = useState(transaction?.needs_reimbursement ? "pribadi" : "kas");
  const [onBehalfOf, setOnBehalfOf] = useState(
    transaction && transaction.user.id !== user.id ? String(transaction.user.id) : ""
  );
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user.role === "bendahara") {
      client.get("/members").then(({ data }) => setMembers(data));
    }
  }, [user.role]);

  useEffect(() => {
    client.get("/categories", { params: { type } }).then(({ data }) => {
      setCategories(data);
      setCategory((prev) => (data.some((c) => c.name === prev) ? prev : ""));
    });
  }, [type]);

  function handleCategorySelect(value) {
    if (value === ADD_NEW) {
      setShowAddCategory(true);
      return;
    }
    setCategory(value);
  }

  function handleCategoryCreated(newCategory) {
    setCategories((prev) => [...prev, newCategory]);
    setCategory(newCategory.name);
    setShowAddCategory(false);
  }

  const showPaidWith = type === "pengeluaran" && (user.role !== "bendahara" || onBehalfOf !== "");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!category) {
      setError("Pilih kategori terlebih dahulu");
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("amount", amount);
      form.append("description", description);
      form.append("category", category);
      form.append("date", date);
      if (onBehalfOf) form.append("on_behalf_of", onBehalfOf);
      if (showPaidWith) form.append("paid_with", paidWith);
      if (file) form.append("bukti", file);

      if (isEdit) {
        await client.put(`/transactions/${transaction.id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await client.post("/transactions", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">
            {isEdit ? "Edit Transaksi" : "Tambah Transaksi"}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setType("pemasukan");
              setCategory("");
            }}
            className={`py-2 rounded-lg text-sm font-medium transition-colors ${
              type === "pemasukan" ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => {
              setType("pengeluaran");
              setCategory("");
            }}
            className={`py-2 rounded-lg text-sm font-medium transition-colors ${
              type === "pengeluaran" ? "bg-red-500 text-white" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            Pengeluaran
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {user.role === "bendahara" && (
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Dicatat untuk</label>
              <select
                value={onBehalfOf}
                onChange={(e) => setOnBehalfOf(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="">Tidak ada (saya sendiri)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={formatWithThousands(amount)}
              onChange={(e) => setAmount(stripThousands(e.target.value))}
              placeholder="0"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Keterangan</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi transaksi..."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Kategori</label>
            <select
              required
              value={category}
              onChange={(e) => handleCategorySelect(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value={ADD_NEW}>+ Tambah Kategori</option>
            </select>
          </div>

          {showPaidWith && (
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Sumber Dana</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaidWith("pribadi")}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    paidWith === "pribadi"
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-neutral-500 border-neutral-200"
                  }`}
                >
                  Uang Pribadi
                </button>
                <button
                  type="button"
                  onClick={() => setPaidWith("kas")}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    paidWith === "kas"
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-neutral-500 border-neutral-200"
                  }`}
                >
                  Uang Kas
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {paidWith === "pribadi"
                  ? "Akan muncul di daftar menunggu penggantian bendahara."
                  : "Dianggap sudah dibayar langsung dari kas, tidak perlu diganti."}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Tanggal</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Bukti {isEdit ? "(kosongkan jika tidak ingin mengganti)" : "(opsional)"}
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:text-neutral-600 file:text-sm"
            />
            {isEdit && transaction.proof_url && !file && (
              <a
                href={resolveMediaUrl(transaction.proof_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded bg-brand/10 text-brand hover:bg-brand/20 text-xs font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Lihat bukti saat ini
              </a>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
          </button>
        </form>
      </div>

      {showAddCategory && (
        <AddCategoryModal
          type={type}
          onClose={() => setShowAddCategory(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}
