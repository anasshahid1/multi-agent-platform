"""
Email sending service using SMTP.

Shared by AI-Times, Wallstreet Wolf, and News Analyst agents
for sending HTML digest emails via Gmail SMTP.
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from config import settings


class EmailService:
    """Async SMTP email sender."""

    async def send_html_email(
        self,
        subject: str,
        html_body: str,
        to_email: Optional[str] = None,
    ) -> bool:
        """
        Send an HTML email via SMTP.

        Args:
            subject: Email subject line
            html_body: HTML content of the email
            to_email: Recipient (defaults to EMAIL_TO from config)

        Returns:
            bool: True if sent successfully
        """
        if not settings.smtp_user or not settings.smtp_password:
            print("[EMAIL] SMTP credentials not configured, skipping send")
            return False

        recipient = to_email or settings.email_to

        message = MIMEMultipart("alternative")
        message["From"] = settings.email_from
        message["To"] = recipient
        message["Subject"] = subject

        # Plain text fallback
        plain_text = "This email requires an HTML-capable email client."
        message.attach(MIMEText(plain_text, "plain"))
        message.attach(MIMEText(html_body, "html"))

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_password,
                start_tls=True,
            )
            print(f"[EMAIL] Sent: '{subject}' to {recipient}")
            return True

        except Exception as e:
            print(f"[EMAIL] Failed to send '{subject}': {e}")
            return False


# Singleton instance
email_service = EmailService()
