"""Seed the database with sample data for local testing / demo.

Run with:  python seed.py
"""
from dotenv import load_dotenv

load_dotenv()

from datetime import date, datetime
from app import create_app
from app.extensions import db
from app.models import Group, User, Transaction, Category

DEFAULT_PASSWORD = "password123"

# (name, type, color)
CATEGORIES = [
    ("Iuran Kas", "pemasukan", "#1e5631"),
    ("Donasi", "pemasukan", "#2f7d4f"),
    ("Dana Desa", "pemasukan", "#0ea5e9"),
    ("Lainnya", "pemasukan", "#6b7280"),
    ("Konsumsi", "pengeluaran", "#f59e0b"),
    ("Perlengkapan", "pengeluaran", "#8b5cf6"),
    ("ATK", "pengeluaran", "#ef4444"),
    ("Dokumentasi", "pengeluaran", "#ec4899"),
    ("Transportasi", "pengeluaran", "#14b8a6"),
    ("Lainnya", "pengeluaran", "#6b7280"),
]

# (name, username, email, role, bank_name, account_number, account_holder)
MEMBERS = [
    ("Ahmad Fauzi", "ahmad.fauzi", "ahmad.fauzi@kkn.local", "bendahara", None, None, None),
    ("Rafi Pratama", "rafi.pratama", "rafi.pratama@kkn.local", "anggota", "BCA", "4550123456", "Rafi Pratama"),
    ("Siti Rahayu", "siti.rahayu", "siti.rahayu@kkn.local", "anggota", "BNI", "0198765432", "Siti Rahayu"),
    ("Budi Santoso", "budi.santoso", "budi.santoso@kkn.local", "anggota", "Mandiri", "1370011223344", "Budi Santoso"),
    ("Dewi Lestari", "dewi.lestari", "dewi.lestari@kkn.local", "anggota", "BRI", "0092134567890", "Dewi Lestari"),
    ("Andi Wijaya", "andi.wijaya", "andi.wijaya@kkn.local", "anggota", None, None, None),
]

# (date, type, description, category, amount, member_name, reimbursed)
# `reimbursed` hanya berlaku untuk pengeluaran yang diajukan anggota (bukan
# bendahara) — None berarti tidak relevan (pemasukan / pengeluaran bendahara).
TRANSACTIONS = [
    (date(2024, 11, 5), "pemasukan", "Iuran kas minggu 1", "Iuran Kas", 50000, "Rafi Pratama", None),
    (date(2024, 11, 6), "pemasukan", "Donasi pembukaan KKN", "Donasi", 100000, "Ahmad Fauzi", None),
    (date(2024, 11, 7), "pengeluaran", "Konsumsi rapat perdana", "Konsumsi", 75000, "Ahmad Fauzi", None),
    (date(2024, 11, 8), "pengeluaran", "Print banner kegiatan", "ATK", 45000, "Siti Rahayu", True),
    (date(2024, 11, 25), "pemasukan", "Iuran kas minggu 2", "Iuran Kas", 50000, "Siti Rahayu", None),
    (date(2024, 11, 25), "pemasukan", "Iuran kas minggu 2", "Iuran Kas", 50000, "Dewi Lestari", None),
    (date(2024, 12, 2), "pemasukan", "Iuran kas minggu 3", "Iuran Kas", 50000, "Rafi Pratama", None),
    (date(2024, 12, 2), "pemasukan", "Iuran kas minggu 3", "Iuran Kas", 50000, "Budi Santoso", None),
    (date(2024, 12, 2), "pemasukan", "Iuran kas minggu 3", "Iuran Kas", 50000, "Andi Wijaya", None),
    (date(2024, 12, 3), "pengeluaran", "Transportasi survey lokasi", "Transportasi", 30000, "Budi Santoso", True),
    (date(2024, 12, 5), "pengeluaran", "ATK dan alat tulis", "ATK", 25000, "Dewi Lestari", True),
    (date(2024, 12, 10), "pemasukan", "Dana desa untuk kegiatan", "Dana Desa", 200000, "Ahmad Fauzi", None),
    (date(2024, 12, 15), "pengeluaran", "Konsumsi kegiatan penyuluhan", "Konsumsi", 120000, "Ahmad Fauzi", None),
    (date(2024, 12, 30), "pemasukan", "Iuran kas minggu 4", "Iuran Kas", 50000, "Budi Santoso", None),
    (date(2024, 12, 30), "pemasukan", "Iuran kas minggu 4", "Iuran Kas", 50000, "Andi Wijaya", None),
    (date(2025, 1, 6), "pemasukan", "Iuran kas minggu 5", "Iuran Kas", 50000, "Siti Rahayu", None),
    (date(2025, 1, 6), "pemasukan", "Iuran kas minggu 5", "Iuran Kas", 50000, "Dewi Lestari", None),
    (date(2025, 1, 8), "pengeluaran", "Dokumentasi foto kegiatan", "Dokumentasi", 60000, "Andi Wijaya", False),
    (date(2025, 1, 12), "pengeluaran", "Perlengkapan posyandu desa", "Perlengkapan", 85000, "Rafi Pratama", False),
    (date(2025, 1, 14), "pemasukan", "Donasi warga RT 04", "Donasi", 150000, "Ahmad Fauzi", None),
]


def run():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        group = Group(name="Kelompok 12", desa="Sukamakmur")
        db.session.add(group)

        for name, tx_type, color in CATEGORIES:
            db.session.add(Category(name=name, type=tx_type, color=color))

        users_by_name = {}
        for name, username, email, role, bank_name, account_number, account_holder in MEMBERS:
            user = User(
                name=name,
                username=username,
                email=email,
                role=role,
                bank_name=bank_name,
                bank_account_number=account_number,
                bank_account_holder=account_holder,
            )
            user.set_password(DEFAULT_PASSWORD)
            db.session.add(user)
            users_by_name[name] = user
        db.session.flush()

        for tx_date, tx_type, desc, category, amount, member_name, reimbursed in TRANSACTIONS:
            needs_reimbursement = reimbursed is not None
            db.session.add(
                Transaction(
                    type=tx_type,
                    amount=amount,
                    description=desc,
                    category=category,
                    date=tx_date,
                    user_id=users_by_name[member_name].id,
                    needs_reimbursement=needs_reimbursement,
                    reimbursed=bool(reimbursed),
                    reimbursed_at=datetime.utcnow() if reimbursed else None,
                )
            )

        db.session.commit()
        print(f"Seed selesai: {len(MEMBERS)} anggota, {len(TRANSACTIONS)} transaksi.")
        print(f"Password default semua akun: {DEFAULT_PASSWORD}")
        for name, username, email, role, *_ in MEMBERS:
            print(f"  - {username} ({email}) ({role})")


if __name__ == "__main__":
    run()
