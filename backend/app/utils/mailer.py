from typing import Optional, Dict
from email.message import EmailMessage
import smtplib
from app.core.config import settings

# jinja2 をインポートしようとします。存在しない場合はプレーンテキストのみで安全にフォールバックします。
try:
    from jinja2 import Environment, PackageLoader, select_autoescape
    _jinja_env = Environment(
        loader=PackageLoader("app", "templates"),
        autoescape=select_autoescape(["html", "xml"]),
    )
except Exception:
    _jinja_env = None

def send_confirmation_email(
    to_email: str,
    subject: str,
    body: Optional[str] = None,
    template_name: Optional[str] = None,
    context: Optional[Dict] = None,
) -> None:
    """シンプルな SMTP を使ってメールを送信します（開発時は MailHog を想定）。

    Jinja2 テンプレートを利用可能な場合はテンプレートをレンダリングして
    テキスト/HTML の multipart メールを作成します。テンプレートがない場合は
    プレーンテキストの `body` をそのまま本文として使います。
    """

    if not settings.MAIL_ENABLED and settings.APP_ENV != "production":
        # 開発モード（MAIL_ENABLED=false かつ APP_ENV≠production）では実際には送信せず、送信予定内容を出力します。
        rendered = body or ""
        if template_name and _jinja_env:
            try:
                txt_t = _jinja_env.get_template(f"emails/{template_name}.txt")
                rendered = txt_t.render(**(context or {}))
            except Exception:
                # テンプレートが無い／レンダリング失敗は無視してフォールバック
                pass
        print(f"[mailer] 開発モード - 送信先 {to_email} に送信する予定: {subject}\n{rendered}")
        return

    msg = EmailMessage()
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    text_body = body or ""
    html_body = None

    if template_name and _jinja_env:
        try:
            txt_t = _jinja_env.get_template(f"emails/{template_name}.txt")
            text_body = txt_t.render(**(context or {}))
        except Exception:
            pass
        try:
            html_t = _jinja_env.get_template(f"emails/{template_name}.html")
            html_body = html_t.render(**(context or {}))
        except Exception:
            html_body = None

    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT) as smtp:
        if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
            smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        smtp.send_message(msg)
