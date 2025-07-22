from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List
import logging
import os
import smtplib

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_username)
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "1") == "1"
        
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured")
    
    def send_email(
        self, 
        subject: str, 
        html_body: Optional[str] = None
    ) -> dict:
        if not self.smtp_username or not self.smtp_password:
            return {
                "success": False,
                "error": "SMTP not configured"
            }
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_from_email
            msg['To'] = to = self.smtp_from_email
            
            msg.attach(MIMEText(html_body, 'html'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to}")
            return {
                "success": True,
                "message": "Email sent successfully"
            }
            
        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed")
            return {
                "success": False,
                "error": "Authentication failed"
            }
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {str(e)}")
            return {
                "success": False,
                "error": f"SMTP error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Email sending failed: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to send email: {str(e)}"
            }
