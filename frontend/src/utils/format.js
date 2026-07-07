export function formatRupiah(amount) {
  const n = Math.abs(Number(amount) || 0);
  return "Rp " + n.toLocaleString("id-ID");
}

// Menambahkan koma sebagai pemisah ribuan sambil mengetik, mis. "1,500,000".
export function formatWithThousands(digitsOnly) {
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("en-US");
}

export function stripThousands(value) {
  return value.replace(/[^\d]/g, "");
}

const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}
