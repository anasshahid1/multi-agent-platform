"""
Mailman Agent.

Monitors a Gmail inbox via IMAP, uses the local LLM to classify
each unread email, and applies labels/stars based on the classification.

Schedule: Every 30 minutes (configurable)
Trigger: Manual from dashboard

Classifications:
- URGENT: Needs immediate attention (starred + alert)
- IMPORTANT: Should be read soon
- NEWSLETTER: Subscriptions and digests
- NOTIFICATION: Automated notifications
- SPAM: Likely spam or unwanted
"""

import imaplib
import email
from email.header import decode_header
from datetime import datetime

from agents.base_agent import BaseAgent
from orchestrator.scheduler import llm_scheduler, RequestPriority
from config import settings


class MailmanAgent(BaseAgent):
    """
    Monitors Gmail inbox, classifies emails with LLM,
    and applies labels and stars.
    """

    def __init__(self):
        super().__init__(
            agent_id="mailman",
            name="Mailman",
            description="Monitors Gmail inbox; classifies emails with LLM; labels, stars, alerts",
        )

    async def execute(self) -> int:
        """
        1. Connect to Gmail via IMAP
        2. Fetch unread emails
        3. Classify each email with LLM
        4. Log classifications and alert on urgent emails
        """
        if not settings.imap_user or not settings.imap_password:
            await self.log("WARNING", "IMAP credentials not configured, skipping")
            return 0

        await self.log("INFO", "Connecting to Gmail IMAP...")

        try:
            emails = await self._fetch_unread_emails()
        except Exception as e:
            await self.log("ERROR", f"IMAP connection failed: {e}")
            return 0

        if not emails:
            await self.log("INFO", "No unread emails found")
            return 0

        await self.log("INFO", f"Found {len(emails)} unread emails to classify")

        classified_count = 0
        for mail in emails:
            try:
                classification = await self._classify_email(mail)
                mail["classification"] = classification

                await self.log(
                    "INFO",
                    f"[{classification}] From: {mail['from']} | "
                    f"Subject: {mail['subject'][:60]}"
                )

                if classification == "URGENT":
                    await self.log(
                        "WARNING",
                        f"URGENT email from {mail['from']}: {mail['subject']}"
                    )

                classified_count += 1

            except Exception as e:
                await self.log(
                    "WARNING",
                    f"Failed to classify email from {mail.get('from', 'unknown')}: {e}"
                )

        await self.log(
            "INFO",
            f"Classified {classified_count}/{len(emails)} emails"
        )

        return classified_count

    async def _fetch_unread_emails(self, limit: int = 10) -> list[dict]:
        """Fetch unread emails from Gmail via IMAP (synchronous)."""
        import asyncio

        def _fetch():
            mail_conn = imaplib.IMAP4_SSL(
                settings.imap_host, settings.imap_port
            )
            mail_conn.login(settings.imap_user, settings.imap_password)
            mail_conn.select("INBOX")

            _, message_numbers = mail_conn.search(None, "UNSEEN")
            email_ids = message_numbers[0].split()

            # Get the latest N emails
            email_ids = email_ids[-limit:] if len(email_ids) > limit else email_ids

            emails = []
            for eid in email_ids:
                _, msg_data = mail_conn.fetch(eid, "(RFC822)")
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])

                        subject = self._decode_header(msg["Subject"])
                        sender = self._decode_header(msg["From"])
                        date_str = msg.get("Date", "")

                        # Get body preview
                        body_preview = self._get_body_preview(msg)

                        emails.append({
                            "id": eid.decode(),
                            "from": sender,
                            "subject": subject,
                            "date": date_str,
                            "body_preview": body_preview[:500],
                        })

            # Mark emails as unread again (we only classify, don't consume)
            for eid in email_ids:
                mail_conn.store(eid, "-FLAGS", "\\Seen")

            mail_conn.logout()
            return emails

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _fetch)

    def _decode_header(self, header_value: str) -> str:
        """Decode email header value."""
        if not header_value:
            return ""
        decoded_parts = decode_header(header_value)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(charset or "utf-8", errors="replace"))
            else:
                result.append(part)
        return " ".join(result)

    def _get_body_preview(self, msg) -> str:
        """Extract plain text body preview from email."""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            return payload.decode("utf-8", errors="replace")
                    except Exception:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    return payload.decode("utf-8", errors="replace")
            except Exception:
                pass
        return ""

    async def _classify_email(self, mail: dict) -> str:
        """Use LLM to classify an email."""
        prompt = (
            f"Classify this email into exactly ONE category.\n\n"
            f"From: {mail['from']}\n"
            f"Subject: {mail['subject']}\n"
            f"Body preview: {mail['body_preview'][:300]}\n\n"
            f"Categories:\n"
            f"- URGENT: Requires immediate attention (personal, deadlines, critical)\n"
            f"- IMPORTANT: Should be read soon (work-related, requests)\n"
            f"- NEWSLETTER: Subscriptions, digests, marketing\n"
            f"- NOTIFICATION: Automated alerts, receipts, confirmations\n"
            f"- SPAM: Unwanted, promotional, phishing\n\n"
            f"Respond with ONLY the category name, nothing else."
        )

        system_prompt = (
            "You are an email classifier. Respond with exactly one word: "
            "URGENT, IMPORTANT, NEWSLETTER, NOTIFICATION, or SPAM. "
            "No explanation, no punctuation, just the category."
        )

        result = await llm_scheduler.submit(
            agent_id=self.agent_id,
            task_description=f"Classify email: {mail['subject'][:40]}",
            prompt=prompt,
            system_prompt=system_prompt,
            priority=RequestPriority.HIGH,
            temperature=0.1,
            max_tokens=20,
            model="llama3.2:3b",
        )

        response = result["response"].strip().upper()

        # Validate classification
        valid = {"URGENT", "IMPORTANT", "NEWSLETTER", "NOTIFICATION", "SPAM"}
        for category in valid:
            if category in response:
                return category

        return "NOTIFICATION"  # Default fallback
