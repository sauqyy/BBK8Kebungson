import { useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";

export default function ProfileModal({ onClose, onSaved }) {
  useLockBodyScroll();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }
    if (newPassword && !currentPassword) {
      setError("Masukkan password saat ini untuk mengganti password");
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      if (name.trim() && name.trim() !== user.name) form.append("name", name.trim());
      if (avatarFile) form.append("avatar", avatarFile);

      let updatedUser = user;
      if (form.has("name") || form.has("avatar")) {
        const { data } = await client.patch("/auth/profile", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updatedUser = data;
      }

      if (newPassword) {
        await client.post("/auth/change-password", {
          current_password: currentPassword,
          new_password: newPassword,
        });
      }

      updateUser(updatedUser);
      if (onSaved) onSaved();
      else onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-neutral-900">Edit Profil</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Foto profil"
                className="w-20 h-20 rounded-full object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-light text-brand flex items-center justify-center text-2xl font-medium">
                {user.initials}
              </div>
            )}
            <label className="text-xs text-brand hover:text-brand-dark font-medium cursor-pointer">
              Ganti foto profil
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Nama</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Username</label>
            <input
              type="text"
              disabled
              value={user.username}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-neutral-50 text-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-neutral-50 text-neutral-400"
            />
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase mb-3">
              Ganti Password (opsional)
            </p>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Password saat ini"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password baru"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi password baru"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
}
