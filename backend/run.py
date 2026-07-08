from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    from app.telegram_bot import start_telegram_bot

    start_telegram_bot(app)
    app.run(debug=True, use_reloader=False, port=5000)
