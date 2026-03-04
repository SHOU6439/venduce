from typing import Optional, Dict
import smtplib
from email.message import EmailMessage
from app.core.config import settings

# Jinja2 をインポートします。存在しない場合はプレーンテキストのみで安全にフォールバックします。
try:
    from jinja2 import Environment, PackageLoader, select_autoescape
    _jinja_env = Environment(
        loader=PackageLoader("app", "templates"),
        autoescape=select_autoescape(["html", "xml"]),
    )
except Exception:
    _jinja_env = None


def _render_templates(
    body: Optional[str],
    template_name: Optional[str],
    context: Optional[Dict],
) -> tuple[str, Optional[str]]:
    """テンプレートをレンダリングして (text_body, html_body) を返す。"""
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

    return text_body, html_body


def send_confirmation_email(
    to_email: str,
    subject: str,
    body: Optional[str] = None,
    template_name: Optional[str] = None,
    context: Optional[Dict] = None,
) -> None:
    """Resend API を使ってメールを送信します。

    RESEND_API_KEY が未設定の場合は開発モードとして送信内容をコンソールに出力します。
    テンプレートが指定されている場合は Jinja2 でレンダリングした HTML/テキストを使用します。
    """
    text_body, html_body = _render_templates(body, template_name, context)

    if settings.APP_ENV == "production":
        # 本番環境: Resend API 経由で実メール送信
        if not settings.RESEND_API_KEY:
            print(f"[mailer] RESEND_API_KEY 未設定のため送信スキップ - To: {to_email}")
            return

        import resend  # 遅延インポート（テスト時のモックのしやすさのため）
        resend.api_key = settings.RESEND_API_KEY

        params: resend.Emails.SendParams = {
            "from": settings.MAIL_FROM,
            "to": [to_email],
            "subject": subject,
            "text": text_body,
        }
        if html_body:
            params["html"] = html_body

        resend.Emails.send(params)
    else:
        # 開発環境: MailHog (SMTP) 経由で送信
        msg = EmailMessage()
        msg["From"] = settings.MAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(text_body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")

        with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT) as smtp:
            if settings.MAIL_USERNAME and settings.MAIL_PASSWORD:
                smtp.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            smtp.send_message(msg)
