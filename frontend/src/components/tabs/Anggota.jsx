import { useEffect, useState } from "react";
import client from "../../api/client";
import { formatRupiah, formatDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import MemberDetailModal from "../MemberDetailModal";
import DeleteMemberConfirmModal from "../DeleteMemberConfirmModal";
import EditMemberPasswordModal from "../EditMemberPasswordModal";
import { TrashIcon } from "../Icons";
import Avatar from "../Avatar";

export default function Anggota() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    bank_name: "",
    account_number: "",
    account_holder: "",
  });
  const [error, setError] = useState("");
  const [detailMember, setDetailMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [passwordMember, setPasswordMember] = useState(null);
  const [notice, setNotice] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await client.get("/members");
    setMembers(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/members", {
        ...form,
        account_holder: form.account_holder.trim() || form.name,
      });
      setForm({
        name: "",
        username: "",
        email: "",
        password: "",
        bank_name: "",
        account_number: "",
        account_holder: "",
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Gagal menambah anggota");
    }
  }

  function showNotice(type, text) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  function handleMemberDeleted() {
    setDeletingMember(null);
    showNotice("success", "Anggota berhasil dihapus.");
    load();
  }

  function handlePasswordSaved() {
    setPasswordMember(null);
    showNotice("success", "Password anggota berhasil diubah.");
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

      {user.role === "bendahara" && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            {showForm ? "Batal" : "+ Tambah Anggota"}
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="border border-neutral-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Nama</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Username</label>
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Password</label>
            <input
              type="text"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="sm:col-span-3">
            <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase mb-2">
              Rekening (opsional)
            </p>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Nama Bank</label>
            <input
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              placeholder="BCA, BNI, dst."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Nomor Rekening</label>
            <input
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Atas Nama</label>
            <input
              value={form.account_holder}
              onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
              placeholder={form.name || "Sama seperti nama"}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2"
            >
              Simpan Anggota
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-neutral-400 py-10 text-center">Memuat data...</p>}

      <div className="space-y-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar url={m.avatar_url} initials={m.initials} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{m.name}</p>
                <p className="text-xs text-neutral-400">
                  {m.terakhir_aktif ? `Terakhir aktif ${formatDate(m.terakhir_aktif)}` : "Belum ada aktivitas"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 sm:text-right">
              <div>
                <p className="text-xs text-neutral-400 uppercase">Disetor</p>
                <p className="text-sm font-num font-medium text-emerald-600">{formatRupiah(m.disetor)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase">Dikeluarkan</p>
                <p className="text-sm font-num font-medium text-red-500">{formatRupiah(m.dikeluarkan)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 uppercase">Transaksi</p>
                <p className="text-sm font-num font-medium text-neutral-900">{m.jumlah_transaksi}</p>
              </div>
              {user.role === "bendahara" && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setDetailMember(m)}
                    className="text-brand hover:text-brand-dark text-xs font-medium"
                  >
                    Lihat Detail
                  </button>
                  {m.role !== "bendahara" && (
                    <>
                      <button
                        onClick={() => setPasswordMember(m)}
                        className="text-neutral-400 hover:text-brand text-xs"
                      >
                        Ganti Password
                      </button>
                      <button
                        onClick={() => setDeletingMember(m)}
                        className="text-neutral-300 hover:text-red-500"
                        title="Hapus"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {detailMember && (
        <MemberDetailModal member={detailMember} onClose={() => setDetailMember(null)} />
      )}

      {deletingMember && (
        <DeleteMemberConfirmModal
          member={deletingMember}
          onClose={() => setDeletingMember(null)}
          onDeleted={handleMemberDeleted}
        />
      )}

      {passwordMember && (
        <EditMemberPasswordModal
          member={passwordMember}
          onClose={() => setPasswordMember(null)}
          onSaved={handlePasswordSaved}
        />
      )}
    </div>
  );
}
