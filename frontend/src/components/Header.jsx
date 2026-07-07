import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import CategoryManagerModal from "./CategoryManagerModal";
import ConnectTelegramModal from "./ConnectTelegramModal";

function TelegramIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M18.6 3.2 1.9 9.7c-1 .4-1 1.6.1 1.9l4.2 1.3 1.6 5.1c.2.6 1 .8 1.4.3l2.3-2.5 4.4 3.2c.7.5 1.6.1 1.8-.7l3-14.1c.2-.9-.7-1.6-1.5-1.3ZM7 12.9l8.4-6.6c.3-.2.6.1.3.4L9 13.3l-.3 3-1.3-3.4Z" />
    </svg>
  );
}

export default function Header({ groupName = "BBK 8 Kebungson" }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showConnectTelegram, setShowConnectTelegram] = useState(false);
  const [notice, setNotice] = useState(null);
  const menuRef = useRef(null);

  function handleProfileSaved() {
    setShowProfile(false);
    setNotice("Perubahan Anda berhasil disimpan.");
    setTimeout(() => setNotice(null), 3000);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center text-white text-xs font-semibold">
            K
          </div>
          <span className="font-semibold text-neutral-900">Kas KKN</span>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-500">{groupName}</span>
        </div>

        <div className="flex items-center gap-2">
          {!user?.telegram_connected && (
            <button
              onClick={() => setShowConnectTelegram(true)}
              className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-medium pl-3 pr-4 py-1.5 transition-colors"
            >
              <TelegramIcon />
              Connect Telegram
            </button>
          )}

          <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors ${
              menuOpen
                ? "border-brand ring-2 ring-brand-light bg-brand-light/30"
                : "border-transparent hover:bg-neutral-50"
            }`}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center text-sm font-medium">
                {user?.initials}
              </div>
            )}
            <span className="text-sm font-medium text-neutral-800 truncate max-w-[7rem]">
              {user?.name?.split(" ")[0]}
            </span>
            <svg
              className={`w-4 h-4 text-neutral-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-lg py-2 z-40">
              <div className="px-4 py-2 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-900 truncate">{user?.name}</p>
                <p className="text-xs text-neutral-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfile(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Edit Profil
              </button>
              <button
                onClick={() => {
                  setShowConnectTelegram(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                <span className="flex items-center gap-2">
                  <TelegramIcon />
                  Connect Telegram
                </span>
                {user?.telegram_connected && (
                  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              {user?.role === "bendahara" && (
                <button
                  onClick={() => {
                    setShowCategoryManager(true);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Kelola Kategori
                </button>
              )}
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-neutral-50"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} onSaved={handleProfileSaved} />
      )}

      {notice && (
        <div className="fixed top-4 right-4 z-[60] bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg px-4 py-3 shadow-lg">
          {notice}
        </div>
      )}
      {showCategoryManager && (
        <CategoryManagerModal onClose={() => setShowCategoryManager(false)} />
      )}
      {showConnectTelegram && (
        <ConnectTelegramModal onClose={() => setShowConnectTelegram(false)} />
      )}
    </header>
  );
}
