import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLockBodyScroll } from "../utils/useLockBodyScroll";

export default function ConnectTelegramModal({ onClose }) {
  useLockBodyScroll();
  const { user, updateUser } = useAuth();
  const [connected, setConnected] = useState(Boolean(user?.telegram_connected));
  const [telegramUsername, setTelegramUsername] = useState(user?.telegram_username || "");
  const [code, setCode] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const userRef = useRef(user);
  const connectedRef = useRef(connected);
  const codeRef = useRef(code);
  const loadingRef = useRef(loading);

  useEffect(() => {
    userRef.current = user;
    connectedRef.current = connected;
    codeRef.current = code;
    loadingRef.current = loading;
  }, [user, connected, code, loading]);

  useEffect(() => {
    checkStatus();
    pollRef.current = setInterval(checkStatus, 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestOtp() {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.post("/telegram/otp");
      setCode(data.code);
      setBotUsername(data.bot_username || "");
    } catch (err) {
      setError(err.response?.data?.error || "Gagal membuat kode. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      const { data } = await client.get("/telegram/status");
      if (data.connected) {
        if (!connectedRef.current) {
          setConnected(true);
          setTelegramUsername(data.telegram_username || "");
          updateUser({ ...userRef.current, telegram_connected: true, telegram_username: data.telegram_username });
        }
      } else {
        if (connectedRef.current) {
          setConnected(false);
          setTelegramUsername("");
          updateUser({ ...userRef.current, telegram_connected: false, telegram_username: null });
          requestOtp();
        } else if (!codeRef.current && !loadingRef.current) {
          requestOtp();
        }
      }
    } catch {
      // diamkan, coba lagi di polling berikutnya
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDisconnect() {
    setLoading(true);
    setError("");
    try {
      await client.post("/telegram/disconnect");
      setConnected(false);
      setTelegramUsername("");
      updateUser({ ...user, telegram_connected: false, telegram_username: null });
      requestOtp();
    } catch (err) {
      setError(err.response?.data?.error || "Gagal memutuskan koneksi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18.6 3.2 1.9 9.7c-1 .4-1 1.6.1 1.9l4.2 1.3 1.6 5.1c.2.6 1 .8 1.4.3l2.3-2.5 4.4 3.2c.7.5 1.6.1 1.8-.7l3-14.1c.2-.9-.7-1.6-1.5-1.3ZM7 12.9l8.4-6.6c.3-.2.6.1.3.4L9 13.3l-.3 3-1.3-3.4Z" />
            </svg>
            {connected ? "Telegram Terhubung" : "Connect to Telegram"}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">
            ×
          </button>
        </div>

        {connected ? (
          <div className="py-4">
            <p className="text-sm text-neutral-600 mb-2">
              Akun web kamu sudah terhubung ke Telegram
              {telegramUsername ? (
                <>
                  {" "}
                  sebagai <span className="font-medium text-neutral-900">@{telegramUsername}</span>
                </>
              ) : null}
              . Kamu bisa langsung chat pengeluaran ke bot.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                {loading ? "Memutus..." : "Putuskan Koneksi"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-500 mb-4">
              Hubungkan akun web kamu ke Telegram untuk mencatat transaksi lewat chat atau upload foto struk belanja
              kapan saja!
            </p>

            <p className="text-xs font-medium text-neutral-500 mb-1">Your Special Authentication Code</p>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-2xl font-mono font-semibold tracking-[0.3em] text-neutral-900">
                {loading ? "......" : code || "------"}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!code}
                title="Salin kode"
                className="w-11 h-11 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a2 2 0 00-2 2v9a2 2 0 002 2h7a2 2 0 002-2V8.414A2 2 0 0015.414 7L11 2.586A2 2 0 009.586 2H7z" />
                    <path d="M4 6a2 2 0 00-2 2v9a2 2 0 002 2h7a2 2 0 001.732-1H6a1 1 0 01-1-1V6z" />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-xs font-medium text-neutral-500 mb-2">Steps to Connect:</p>
            <ol className="space-y-2 text-sm text-neutral-700 mb-5 list-decimal list-inside">
              <li>
                Open Telegram and search for our official bot:{" "}
                <span className="font-medium text-brand">@{botUsername || "..."}</span>
              </li>
              <li>
                Start conversation by pressing <span className="font-medium">Start</span> or sending the{" "}
                <code className="bg-neutral-100 px-1 rounded">/start</code> command.
              </li>
              <li>
                Send your connect code by typing:
                <div className="mt-1 bg-neutral-100 rounded px-2 py-1 font-mono text-xs inline-block">
                  /connect {code || "------"}
                </div>
              </li>
            </ol>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={checkStatus}
                className="flex-1 flex items-center justify-center gap-1.5 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                    clipRule="evenodd"
                  />
                </svg>
                Refresh Status
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
