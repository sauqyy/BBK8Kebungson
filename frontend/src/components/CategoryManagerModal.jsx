import { useEffect, useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import client from "../api/client";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";
import ConfirmModal from "./ConfirmModal";
import { TrashIcon, PencilIcon } from "./Icons";

const PRESET_COLORS = [
  "#171717",
  "#ffffff",
  "#6b7280",
  "#d1d5db",
  "#8b5cf6",
  "#64748b",
  "#38bdf8",
  "#2563eb",
  "#1e5631",
  "#ef4444",
  "#f59e0b",
  "#ec4899",
];

export default function CategoryManagerModal({ onClose }) {
  useLockBodyScroll();
  const [type, setType] = useState("pengeluaran");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6b7280");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await client.get("/categories", { params: { type } });
    setCategories(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function startEdit(c) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
    setShowPicker(false);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setShowPicker(false);
    setError("");
  }

  async function handleSave(id) {
    if (!editName.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await client.patch(`/categories/${id}`, { name: editName.trim(), color: editColor });
      setEditingId(null);
      setShowPicker(false);
      await load();
      window.dispatchEvent(new Event("categories-updated"));
    } catch (err) {
      setError(err.response?.data?.error || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await client.delete(`/categories/${deletingCategory.id}`);
    setDeletingCategory(null);
    await load();
    window.dispatchEvent(new Event("categories-updated"));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-neutral-900">Kelola Kategori</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="px-5">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setType("pemasukan");
                setEditingId(null);
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
                setEditingId(null);
              }}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "pengeluaran" ? "bg-red-500 text-white" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              Pengeluaran
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 overflow-y-auto space-y-2">
          {loading && <p className="text-sm text-neutral-400 py-6 text-center">Memuat...</p>}
          {!loading && categories.length === 0 && (
            <p className="text-sm text-neutral-400 py-6 text-center">Belum ada kategori.</p>
          )}

          {categories.map((c) => (
            <div key={c.id} className="border border-neutral-200 rounded-lg p-3">
              {editingId === c.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPicker((v) => !v)}
                      className="w-8 h-8 rounded-full border border-neutral-200 shrink-0"
                      style={{ backgroundColor: editColor }}
                      title="Ubah warna"
                    />
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />
                  </div>

                  {showPicker && (
                    <div className="category-color-picker">
                      <HexColorPicker color={editColor} onChange={setEditColor} />
                      <div className="flex items-center gap-2 mt-3">
                        <div
                          className="w-9 h-9 rounded-lg border border-neutral-200 shrink-0"
                          style={{ backgroundColor: editColor }}
                        />
                        <div className="flex items-center flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                          <span className="text-neutral-400 mr-1">#</span>
                          <HexColorInput
                            color={editColor}
                            onChange={setEditColor}
                            className="w-full outline-none uppercase"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-2 mt-3">
                        {PRESET_COLORS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setEditColor(preset)}
                            className={`w-full aspect-square rounded-full border ${
                              editColor.toLowerCase() === preset ? "ring-2 ring-offset-1 ring-brand" : "border-neutral-200"
                            }`}
                            style={{ backgroundColor: preset }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(c.id)}
                      disabled={saving}
                      className="bg-brand hover:bg-brand-dark text-white text-xs font-medium rounded-lg px-3 py-1.5 disabled:opacity-60"
                    >
                      {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-medium rounded-lg px-3 py-1.5"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-200 shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-sm text-neutral-800 truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-brand hover:text-brand-dark"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCategory(c)}
                      className="text-neutral-300 hover:text-red-500"
                      title="Hapus"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {deletingCategory && (
        <ConfirmModal
          title="Hapus Kategori"
          message={`Yakin ingin menghapus kategori "${deletingCategory.name}"? Transaksi lama yang memakainya tidak akan terhapus.`}
          onConfirm={handleDelete}
          onClose={() => setDeletingCategory(null)}
        />
      )}
    </div>
  );
}
