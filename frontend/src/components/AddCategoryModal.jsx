import { useState } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import client from "../api/client";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";

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

export default function AddCategoryModal({ type, onClose, onCreated }) {
  useLockBodyScroll();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1e5631");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const { data } = await client.post("/categories", { name: name.trim(), type, color });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || "Gagal menambah kategori");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[60]">
      <div className="bg-white rounded-xl w-full max-w-xs shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-neutral-900">Kategori Baru</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 space-y-4">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Nama Kategori</label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Sewa Alat"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-600 mb-2">Warna Kategori</label>

              <button
                type="button"
                onClick={() => setShowPicker((v) => !v)}
                className="w-9 h-9 rounded-full border border-neutral-200"
                style={{ backgroundColor: color }}
                title="Ubah warna"
              />

              {showPicker && (
                <div className="category-color-picker mt-3">
                  <HexColorPicker color={color} onChange={setColor} />

                  <div className="flex items-center gap-2 mt-3">
                    <div
                      className="w-9 h-9 rounded-lg border border-neutral-200 shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex items-center flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                      <span className="text-neutral-400 mr-1">#</span>
                      <HexColorInput
                        color={color}
                        onChange={setColor}
                        className="w-full outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 mt-3">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setColor(preset)}
                        className={`w-full aspect-square rounded-full border ${
                          color.toLowerCase() === preset ? "ring-2 ring-offset-1 ring-brand" : "border-neutral-200"
                        }`}
                        style={{ backgroundColor: preset }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="px-5 py-4 mt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Tambah Kategori"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
