import { useState } from "react";
import Header from "../components/Header";
import Ringkasan from "../components/tabs/Ringkasan";
import Transaksi from "../components/tabs/Transaksi";
import Anggota from "../components/tabs/Anggota";

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "transaksi", label: "Transaksi" },
  { key: "anggota", label: "Anggota" },
];

export default function Dashboard() {
  const [tab, setTab] = useState("ringkasan");

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard Bendahara</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Kelola keuangan BBK 8 UNAIR Gresik — Kelurahan Kebungson
        </p>

        <div className="flex gap-6 border-b border-neutral-200 mt-6 mb-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-brand text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={tab === "ringkasan" ? "" : "hidden"}>
          <Ringkasan />
        </div>
        <div className={tab === "transaksi" ? "" : "hidden"}>
          <Transaksi />
        </div>
        <div className={tab === "anggota" ? "" : "hidden"}>
          <Anggota />
        </div>
      </main>
    </div>
  );
}
