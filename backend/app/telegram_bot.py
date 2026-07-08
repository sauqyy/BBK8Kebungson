import asyncio
import hashlib
import json
import logging
import os
import threading
import time
import uuid
from datetime import date, datetime

from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from app.extensions import db
from app.models import Category, TelegramDraft, Transaction, User

logger = logging.getLogger(__name__)

_app = None
_application = None
_loop = None
_webhook_secret = None

PRIBADI_KEYWORDS = ("pribadi", "sendiri", "saku")
KAS_KEYWORDS = ("kas", "kantor", "kelompok")


def _build_application(token):
    application = Application.builder().token(token).build()
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("connect", cmd_connect))
    application.add_handler(CommandHandler("disconnect", cmd_disconnect))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    return application


def start_telegram_bot(app):
    """Jalankan bot Telegram. No-op kalau token kosong.

    Pakai mode webhook kalau TELEGRAM_WEBHOOK_BASE_URL tersedia (production di
    Render) supaya tidak perlu koneksi long-polling yang rentan ConnectTimeout.
    Jatuh balik ke polling untuk dev lokal.
    """
    global _app
    _app = app
    token = app.config.get("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN kosong, bot Telegram tidak dijalankan.")
        return

    webhook_base = app.config.get("TELEGRAM_WEBHOOK_BASE_URL")
    if webhook_base:
        _start_webhook_mode(app, token, webhook_base)
    else:
        _start_polling_mode(token)


def _start_polling_mode(token):
    def run():
        asyncio.set_event_loop(asyncio.new_event_loop())
        while True:
            try:
                application = _build_application(token)
                application.run_polling(stop_signals=None, close_loop=False)
                break
            except Exception:
                logger.exception(
                    "Bot Telegram (polling) berhenti karena error, mencoba lagi dalam 10 detik."
                )
                time.sleep(10)

    thread = threading.Thread(target=run, daemon=True, name="telegram-bot-polling")
    thread.start()
    logger.info("Bot Telegram mulai polling di background thread.")


def _start_webhook_mode(app, token, webhook_base):
    global _application, _loop, _webhook_secret

    # Deterministik (turunan dari token), bukan random, supaya tetap sama di
    # setiap restart/deploy. Kalau berubah tiap boot, update webhook yang
    # tersimpan di sisi Telegram jadi basi begitu proses lama mati sebelum
    # sempat re-register (rentan kalau initialize()/set_webhook sempat gagal
    # network), sehingga semua update ditolak 403 karena secret tidak cocok.
    _webhook_secret = app.config.get("TELEGRAM_WEBHOOK_SECRET") or hashlib.sha256(
        f"kkn-telegram-webhook:{token}".encode()
    ).hexdigest()
    app.config["TELEGRAM_WEBHOOK_SECRET"] = _webhook_secret
    webhook_url = webhook_base.rstrip("/") + "/api/telegram/webhook"

    def run():
        global _application, _loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        _loop = loop

        async def setup():
            global _application
            while True:
                try:
                    application = _build_application(token)
                    await application.initialize()
                    await application.start()
                    await application.bot.set_webhook(
                        url=webhook_url,
                        secret_token=_webhook_secret,
                        allowed_updates=Update.ALL_TYPES,
                    )
                    _application = application
                    logger.info("Webhook Telegram terpasang: %s", webhook_url)
                    return
                except Exception:
                    logger.exception(
                        "Gagal memasang webhook Telegram, mencoba lagi dalam 10 detik."
                    )
                    await asyncio.sleep(10)

        loop.run_until_complete(setup())
        loop.run_forever()

    thread = threading.Thread(target=run, daemon=True, name="telegram-bot-webhook")
    thread.start()
    logger.info("Bot Telegram mode webhook mulai di background thread.")


def process_webhook_update(data, secret_token):
    """Dipanggil dari route Flask saat Telegram POST update baru. Return False kalau ditolak."""
    if not _webhook_secret or secret_token != _webhook_secret:
        return False
    if not _application or not _loop:
        return False
    update = Update.de_json(data, _application.bot)
    asyncio.run_coroutine_threadsafe(_application.process_update(update), _loop)
    return True


def _rupiah(n):
    return f"Rp {n:,.0f}".replace(",", ".")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 <b>Halo! Aku Bot Kas KKN</b> 💸\n"
        "Aku di sini untuk membantu mencatat pengeluaran kelompok secara cepat lewat Telegram!\n\n"
        "<b>Langkah Awal:</b>\n"
        "1️⃣ <b>Hubungkan Akun Web Anda:</b>\n"
        "  • Masuk ke website Kas KKN\n"
        "  • Buka menu <b>Profil</b>\n"
        "  • Klik tombol <b>\"Connect Telegram\"</b>\n"
        "  • Salin kode OTP yang muncul\n"
        "2️⃣ <b>Gunakan Perintah:</b>\n"
        "  Kirim <code>/connect &lt;KODE_OTP&gt;</code> ke bot ini (contoh: <code>/connect 123456</code>)\n\n"
        "Setelah terhubung, Anda tinggal mengetik pengeluaran sesuka hati seperti:\n"
        "💬 <i>\"belanja ATK 15rb\"</i>\n"
        "💬 <i>\"makan malam kelompok habis 120.000\"</i>\n\n"
        "Selamat menggunakan! 🚀",
        parse_mode="HTML"
    )


async def cmd_connect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    args = context.args
    if not args:
        await update.message.reply_text(
            "⚠️ <b>Format Salah!</b>\n"
            "Gunakan format: <code>/connect &lt;kode_otp_6_digit&gt;</code>\n"
            "<i>(Contoh: /connect 871920)</i>",
            parse_mode="HTML"
        )
        return

    code = args[0].strip()
    user_name = None
    with _app.app_context():
        user = User.query.filter(
            User.telegram_otp_code == code,
            User.telegram_otp_expires_at > datetime.utcnow(),
        ).first()
        if user:
            user.telegram_chat_id = chat_id
            user.telegram_username = update.effective_user.username or update.effective_user.first_name
            user.telegram_otp_code = None
            user.telegram_otp_expires_at = None
            db.session.commit()
            user_name = user.name

    if not user_name:
        await update.message.reply_text(
            "❌ <b>Koneksi Gagal!</b>\n"
            "Kode OTP salah atau sudah kedaluwarsa.\n"
            "Silakan generate kode OTP baru melalui menu <b>Profil > Connect Telegram</b> di website.",
            parse_mode="HTML"
        )
        return

    await update.message.reply_text(
        f"🎉 <b>Berhasil Terhubung!</b>\n"
        f"Halo <b>{user_name}</b> 👋\n\n"
        "Sekarang akun Telegram Anda sudah tersambung dengan sistem Kas KKN. Anda bisa langsung mencatat pengeluaran baru kapan saja!\n\n"
        "<b>Contoh:</b>\n"
        "💬 <i>\"beli sapu dan kemoceng 25 ribu\"</i>",
        parse_mode="HTML"
    )


async def cmd_disconnect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    with _app.app_context():
        user = _get_linked_user(chat_id)
        if not user:
            await update.message.reply_text(
                "❌ <b>Gagal!</b>\n"
                "Akun Telegram Anda tidak terhubung dengan akun web Kas KKN mana pun.",
                parse_mode="HTML"
            )
            return

        user.telegram_chat_id = None
        user.telegram_username = None
        db.session.commit()

    await update.message.reply_text(
        "🔌 <b>Koneksi Diputuskan!</b>\n"
        "Akun Telegram Anda sekarang telah diputuskan dari akun web Kas KKN. "
        "Anda tidak lagi dapat mencatat transaksi lewat bot ini.",
        parse_mode="HTML"
    )


def _get_linked_user(chat_id):
    return User.query.filter_by(telegram_chat_id=chat_id).first()


def _get_draft(chat_id):
    row = TelegramDraft.query.get(chat_id)
    return row.to_dict() if row else None


def _save_draft(chat_id, draft):
    row = TelegramDraft.query.get(chat_id)
    if not row:
        row = TelegramDraft(chat_id=chat_id)
        db.session.add(row)
    row.step = draft["step"]
    row.user_id = draft["user_id"]
    row.amount = draft.get("amount")
    row.description = draft.get("description")
    row.category = draft.get("category")
    row.paid_with = draft.get("paid_with")
    row.proof_filename = draft.get("proof_filename")
    db.session.commit()


def _delete_draft(chat_id):
    TelegramDraft.query.filter_by(chat_id=chat_id).delete()
    db.session.commit()


def _summary_text(draft):
    lines = [
        "📋 <b>RINGKASAN TRANSAKSI</b>",
        "────────────────────",
        f"💰 <b>Nominal</b>     : {_rupiah(draft['amount'])}",
        f"✏️ <b>Keterangan</b>  : {draft['description']}",
        f"📁 <b>Kategori</b>    : {draft['category']}",
    ]
    if draft.get("paid_with"):
        source = "💵 Uang Pribadi (Reimbursement)" if draft["paid_with"] == "pribadi" else "💼 Uang Kas Kelompok"
        lines.append(f"💳 <b>Sumber Dana</b> : {source}")
    struk = "✅ Terlampir" if draft.get("proof_filename") else "❌ Tidak ada"
    lines.append(f"📸 <b>Bukti Struk</b> : {struk}")
    lines.append("────────────────────")
    lines.append("\nApakah data di atas sudah benar dan siap disimpan?")
    return "\n".join(lines)


def _save_transaction(draft):
    user = User.query.get(draft["user_id"])
    needs_reimbursement = user.role != "bendahara" and draft.get("paid_with") == "pribadi"
    tx = Transaction(
        type="pengeluaran",
        amount=draft["amount"],
        description=draft["description"],
        category=draft["category"],
        date=date.today(),
        proof_filename=draft.get("proof_filename"),
        user_id=user.id,
        needs_reimbursement=needs_reimbursement,
    )
    db.session.add(tx)
    db.session.commit()


def parse_expense(text):
    """Panggil Gemini dengan schema Pydantic untuk extract {amount, description} dari teks bebas."""
    api_key = _app.config.get("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        from google import genai
        from google.genai import types
        from pydantic import BaseModel
    except ImportError:
        logger.error("Paket google-genai atau pydantic belum terinstall.")
        return None

    class ExpenseData(BaseModel):
        amount: int
        description: str

    prompt = (
        f"Ekstrak data nominal pengeluaran dan deskripsi belanja dari pesan chat bahasa Indonesia berikut:\n"
        f"Pesan: \"{text}\"\n\n"
        f"Aturan:\n"
        f"1. Konversikan nominal seperti \"50rb\", \"50 rb\", \"50 ribu\", \"1.2 juta\", \"100k\" menjadi angka bulat integer bersih (misal: 50000, 1200000, 100000).\n"
        f"2. Deskripsi berupa ringkasan barang yang dibeli (maksimal 5 kata, jangan cantumkan nominal uang).\n"
        f"3. Jika pesan bukan pengeluaran atau tidak memiliki nominal belanja, atur `amount` menjadi 0 dan `description` menjadi kosong."
    )

    models_to_try = ["gemini-2.5-flash", "gemini-1.5-flash"]
    data = None
    last_error = None

    for model_name in models_to_try:
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExpenseData,
                ),
            )
            data = json.loads(response.text)
            break  # Berhasil, keluar dari loop
        except Exception as e:
            logger.warning(f"Gagal memanggil model {model_name}: {e}")
            last_error = e
            continue

    if not data:
        logger.error(f"Gagal memanggil seluruh model Gemini. Error terakhir: {last_error}")
        return None

    try:
        amount = int(data.get("amount", 0))
    except (TypeError, ValueError):
        amount = 0

    if amount <= 0:
        return None

    description = (data.get("description") or text).strip()[:255]

    return {"amount": amount, "description": description}


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    text = (update.message.text or "").strip()
    text_lower = text.lower()

    with _app.app_context():
        user = _get_linked_user(chat_id)
        if not user:
            await update.message.reply_text(
                "⚠️ <b>Akun Telegram Belum Terhubung!</b>\n\n"
                "Untuk menggunakan bot ini, Anda harus menghubungkan akun Telegram Anda dengan akun website Kas KKN terlebih dahulu.\n\n"
                "<b>Cara Menghubungkan:</b>\n"
                "1️⃣ Masuk ke website Kas KKN\n"
                "2️⃣ Buka menu <b>Profil</b>\n"
                "3️⃣ Klik tombol <b>\"Connect Telegram\"</b> untuk mendapatkan Kode OTP\n"
                "4️⃣ Kirim kode tersebut di sini dengan perintah:\n"
                "   <code>/connect &lt;KODE_OTP&gt;</code> <i>(contoh: /connect 123456)</i>",
                parse_mode="HTML"
            )
            return

        draft = _get_draft(chat_id)

        # 1. Menunggu pilihan sumber dana (Uang Sendiri atau Uang Kas)
        if draft and draft["step"] == "awaiting_paid_with":
            if any(k in text_lower for k in PRIBADI_KEYWORDS) or "sendiri" in text_lower or "pribadi" in text_lower:
                draft["paid_with"] = "pribadi"
            elif any(k in text_lower for k in KAS_KEYWORDS) or "kas" in text_lower:
                draft["paid_with"] = "kas"
            else:
                reply_markup = ReplyKeyboardMarkup([["💵 Uang Pribadi", "💼 Uang Kas"]], one_time_keyboard=True, resize_keyboard=True)
                await update.message.reply_text(
                    "⚠️ <b>Mohon pilih salah satu sumber dana menggunakan tombol di bawah ini:</b>",
                    reply_markup=reply_markup,
                    parse_mode="HTML"
                )
                return

            # Berhasil memilih sumber dana, lanjut tanya Kategori
            category_names = [c.name for c in Category.query.filter_by(type="pengeluaran").all()]
            draft["step"] = "awaiting_category"
            _save_draft(chat_id, draft)

            # Siapkan keyboard kategori
            keyboard = []
            for i in range(0, len(category_names), 2):
                keyboard.append(category_names[i:i+2])
            reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
            
            await update.message.reply_text(
                "📁 <b>Kategori Transaksi</b>\n"
                "Pilih kategori pengeluaran yang paling cocok menggunakan tombol di bawah ini:",
                reply_markup=reply_markup,
                parse_mode="HTML"
            )
            return

        # 2. Menunggu pilihan kategori
        if draft and draft["step"] == "awaiting_category":
            category_names = [c.name for c in Category.query.filter_by(type="pengeluaran").all()]
            matched = next((c for c in category_names if c.lower() == text_lower), None)
            if not matched:
                # Coba cari partial match
                matched = next((c for c in category_names if c.lower() in text_lower or text_lower in c.lower()), None)
            
            if matched:
                draft["category"] = matched
                draft["step"] = "awaiting_proof"
                _save_draft(chat_id, draft)
                reply_markup = ReplyKeyboardMarkup([["❌ Tidak Ada Struk"]], one_time_keyboard=True, resize_keyboard=True)
                await update.message.reply_text(
                    f"📁 Kategori Terpilih: <b>{matched}</b>\n\n"
                    f"📸 <b>Bukti Transaksi (Struk)</b>\n"
                    f"Silakan kirim <b>foto struk/nota</b> belanja jika ada.\n"
                    f"Jika tidak ada bukti fisik, silakan tekan tombol <b>\"❌ Tidak Ada Struk\"</b> di bawah.",
                    reply_markup=reply_markup,
                    parse_mode="HTML"
                )
            else:
                keyboard = []
                for i in range(0, len(category_names), 2):
                    keyboard.append(category_names[i:i+2])
                reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
                await update.message.reply_text(
                    "⚠️ Kategori tidak terdaftar. Silakan pilih kategori dari tombol di bawah:",
                    reply_markup=reply_markup
                )
            return

        # 3. Menunggu bukti struk (text version, e.g. "tidak")
        if draft and draft["step"] == "awaiting_proof":
            if "tidak" in text_lower:
                draft["proof_filename"] = None
                draft["step"] = "awaiting_confirm"
                _save_draft(chat_id, draft)
                reply_markup = ReplyKeyboardMarkup([["✅ Simpan", "❌ Batal"]], one_time_keyboard=True, resize_keyboard=True)
                await update.message.reply_text(
                    _summary_text(draft),
                    reply_markup=reply_markup,
                    parse_mode="HTML"
                )
            else:
                reply_markup = ReplyKeyboardMarkup([["❌ Tidak Ada Struk"]], one_time_keyboard=True, resize_keyboard=True)
                await update.message.reply_text(
                    '⚠️ Kirim foto struk belanjaan Anda, atau tekan tombol <b>"❌ Tidak Ada Struk"</b> jika tidak ada.',
                    reply_markup=reply_markup,
                    parse_mode="HTML"
                )
            return

        # 4. Menunggu konfirmasi akhir (Ya / Batal)
        if draft and draft["step"] == "awaiting_confirm":
            if text_lower in ("ya", "iya", "y", "yes") or "simpan" in text_lower:
                _save_transaction(draft)
                _delete_draft(chat_id)
                await update.message.reply_text(
                    "✅ <b>Transaksi Berhasil Disimpan!</b>\n"
                    "Data telah dimasukkan ke database web. Terima kasih!",
                    reply_markup=ReplyKeyboardRemove(),
                    parse_mode="HTML"
                )
            elif text_lower in ("batal", "tidak", "no", "cancel") or "batal" in text_lower:
                _delete_draft(chat_id)
                await update.message.reply_text(
                    "❌ <b>Transaksi Dibatalkan.</b>\n"
                    "Draft telah dihapus. Kirim pesan baru kapan saja untuk mulai mencatat kembali.",
                    reply_markup=ReplyKeyboardRemove(),
                    parse_mode="HTML"
                )
            else:
                reply_markup = ReplyKeyboardMarkup([["✅ Simpan", "❌ Batal"]], one_time_keyboard=True, resize_keyboard=True)
                await update.message.reply_text(
                    "⚠️ Silakan pilih <b>\"✅ Simpan\"</b> untuk menyimpan transaksi, atau <b>\"❌ Batal\"</b> untuk membatalkan.",
                    reply_markup=reply_markup,
                    parse_mode="HTML"
                )
            return

        # Tidak ada draft aktif -> deteksi pengeluaran baru
        user_id = user.id

    parsed = parse_expense(text)
    if not parsed:
        await update.message.reply_text(
            "🔍 <b>Ups, Aku Bingung...</b>\n"
            "Aku tidak dapat mendeteksi jumlah nominal uang atau deskripsi belanja dari pesan Anda.\n\n"
            "<b>Coba ketik seperti ini:</b>\n"
            "• <i>\"beli lem kertas 5rb\"</i>\n"
            "• <i>\"konsumsi rapat 150000\"</i>\n"
            "• <i>\"print laporan kelompok 25.000\"</i>",
            parse_mode="HTML"
        )
        return

    new_draft = {
        "user_id": user_id,
        "amount": parsed["amount"],
        "description": parsed["description"],
        "step": "awaiting_paid_with",
    }

    with _app.app_context():
        _save_draft(chat_id, new_draft)
    reply_markup = ReplyKeyboardMarkup([["💵 Uang Pribadi", "💼 Uang Kas"]], one_time_keyboard=True, resize_keyboard=True)
    await update.message.reply_text(
        f"📝 <b>Pengeluaran Terdeteksi!</b>\n"
        f"• <b>Deskripsi</b>: {parsed['description']}\n"
        f"• <b>Nominal</b>: {_rupiah(parsed['amount'])}\n\n"
        f"👉 <b>Bagaimana transaksi ini dibayar?</b>\n"
        f"Pilih sumber dana menggunakan tombol di bawah ini:",
        reply_markup=reply_markup,
        parse_mode="HTML"
    )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)

    with _app.app_context():
        user = _get_linked_user(chat_id)
        if not user:
            await update.message.reply_text(
                "⚠️ <b>Akun Telegram Belum Terhubung!</b>\n\n"
                "Untuk menggunakan bot ini, Anda harus menghubungkan akun Telegram Anda dengan akun website Kas KKN terlebih dahulu.\n\n"
                "<b>Cara Menghubungkan:</b>\n"
                "1️⃣ Masuk ke website Kas KKN\n"
                "2️⃣ Buka menu <b>Profil</b>\n"
                "3️⃣ Klik tombol <b>\"Connect Telegram\"</b> untuk mendapatkan Kode OTP\n"
                "4️⃣ Kirim kode tersebut di sini dengan perintah:\n"
                "   <code>/connect &lt;KODE_OTP&gt;</code> <i>(contoh: /connect 123456)</i>",
                parse_mode="HTML"
            )
            return

        draft = _get_draft(chat_id)
        if not draft or draft["step"] != "awaiting_proof":
            await update.message.reply_text("Tidak ada transaksi yang sedang menunggu bukti struk saat ini.")
            return

        upload_folder = _app.config["UPLOAD_FOLDER"]

    photo = update.message.photo[-1]
    tg_file = await context.bot.get_file(photo.file_id)
    filename = f"{uuid.uuid4().hex}.jpg"
    path = os.path.join(upload_folder, filename)
    await tg_file.download_to_drive(path)

    draft["proof_filename"] = filename
    draft["step"] = "awaiting_confirm"
    with _app.app_context():
        _save_draft(chat_id, draft)
    reply_markup = ReplyKeyboardMarkup([["✅ Simpan", "❌ Batal"]], one_time_keyboard=True, resize_keyboard=True)
    await update.message.reply_text(
        _summary_text(draft),
        reply_markup=reply_markup,
        parse_mode="HTML"
    )
