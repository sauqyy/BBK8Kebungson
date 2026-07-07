from datetime import datetime, date
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class Group(db.Model):
    __tablename__ = "groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, default="Kelompok KKN")
    desa = db.Column(db.String(120), nullable=False, default="")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "desa": self.desa}


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="anggota")  # 'bendahara' | 'anggota'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    bank_name = db.Column(db.String(60), nullable=True)
    bank_account_number = db.Column(db.String(50), nullable=True)
    bank_account_holder = db.Column(db.String(120), nullable=True)

    avatar_filename = db.Column(db.String(255), nullable=True)

    telegram_chat_id = db.Column(db.String(64), unique=True, nullable=True)
    telegram_username = db.Column(db.String(120), nullable=True)
    telegram_otp_code = db.Column(db.String(6), nullable=True)
    telegram_otp_expires_at = db.Column(db.DateTime, nullable=True)

    transactions = db.relationship("Transaction", backref="user", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def initials(self):
        parts = self.name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[1][0]).upper()
        return self.name[:2].upper() if self.name else "?"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "initials": self.initials(),
            "avatar_url": f"/uploads/{self.avatar_filename}" if self.avatar_filename else None,
            "telegram_connected": bool(self.telegram_chat_id),
            "telegram_username": self.telegram_username,
        }

    def bank_account_dict(self):
        return {
            "bank_name": self.bank_name,
            "account_number": self.bank_account_number,
            "account_holder": self.bank_account_holder,
        }


class Category(db.Model):
    __tablename__ = "categories"
    __table_args__ = (db.UniqueConstraint("name", "type", name="uq_category_name_type"),)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'pemasukan' | 'pengeluaran'
    color = db.Column(db.String(7), nullable=False, default="#6b7280")  # hex, e.g. #1e5631
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "type": self.type, "color": self.color}


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)  # 'pemasukan' | 'pengeluaran'
    amount = db.Column(db.Integer, nullable=False)  # stored in Rupiah, no decimals
    description = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(60), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    proof_filename = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Untuk pengeluaran yang dibayar dulu pakai uang pribadi anggota, menunggu
    # ditransfer balik oleh bendahara. Tidak relevan untuk transaksi pemasukan
    # atau pengeluaran yang memang langsung dibayar oleh bendahara dari kas.
    needs_reimbursement = db.Column(db.Boolean, nullable=False, default=False)
    reimbursed = db.Column(db.Boolean, nullable=False, default=False)
    reimbursed_at = db.Column(db.DateTime, nullable=True)
    reimbursement_proof_filename = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "amount": self.amount,
            "description": self.description,
            "category": self.category,
            "date": self.date.isoformat(),
            "proof_url": f"/uploads/{self.proof_filename}" if self.proof_filename else None,
            "user": {
                "id": self.user.id,
                "name": self.user.name,
                "initials": self.user.initials(),
                "avatar_url": f"/uploads/{self.user.avatar_filename}" if self.user.avatar_filename else None,
            },
            "needs_reimbursement": self.needs_reimbursement,
            "reimbursed": self.reimbursed,
            "reimbursed_at": self.reimbursed_at.isoformat() if self.reimbursed_at else None,
            "reimbursement_proof_url": (
                f"/uploads/{self.reimbursement_proof_filename}" if self.reimbursement_proof_filename else None
            ),
        }
