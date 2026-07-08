def post_fork(server, worker):
    """Start Bot Telegram di sini, bukan saat modul run.py di-import.

    Gunicorn meng-import 'run:app' sebelum fork ke worker. Kalau bot
    di-start di titik itu, thread background-nya jalan di proses master
    dan tidak ikut tersalin ke worker anak (thread tidak survive fork()),
    sehingga worker yang benar-benar melayani HTTP request selamanya
    punya _application=None dan menolak semua webhook Telegram.
    post_fork dijamin gunicorn berjalan di proses worker setelah fork,
    jadi thread bot benar-benar hidup di proses yang menerima request.
    """
    from run import app
    from app.telegram_bot import start_telegram_bot

    start_telegram_bot(app)
