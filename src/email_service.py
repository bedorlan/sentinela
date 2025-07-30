from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
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
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "1") == "1"
        
        if not self.smtp_username or not self.smtp_password or not self.smtp_from_email:
            logger.warning("SMTP credentials not configured")
    
    def send_email(
        self, 
        subject: str, 
        to_email: str,
        html_body: Optional[str] = None,
        video_attachment: Optional[str] = None
    ) -> dict:
        if not self.smtp_username or not self.smtp_password:
            return {
                "success": False,
                "error": "SMTP not configured"
            }
        
        try:
            msg = MIMEMultipart('mixed')
            msg['Subject'] = subject
            msg['From'] = self.smtp_from_email
            msg['To'] = to_email
            
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            if video_attachment:
                if not video_attachment.startswith('data:'):
                    return {
                        "success": False,
                        "error": "Only data URLs are supported for video attachments"
                    }
                
                if 'base64,' not in video_attachment:
                    return {
                        "success": False,
                        "error": "Invalid data URL format"
                    }
                
                try:
                    header, encoded_data = video_attachment.split('base64,', 1)
                    
                    if 'video/mp4' in header:
                        filename = "detection_video.mp4"
                    else:
                        filename = "detection_video.webm"
                    
                    attachment = MIMEBase('application', 'octet-stream')
                    attachment.set_payload(encoded_data)
                    attachment.add_header('Content-Transfer-Encoding', 'base64')
                    attachment.add_header(
                        'Content-Disposition',
                        f'attachment; filename="{filename}"'
                    )
                    msg.attach(attachment)
                    
                except Exception as e:
                    logger.warning(f"Failed to attach video: {str(e)}")
                    return {
                        "success": False,
                        "error": f"Failed to attach video: {str(e)}"
                    }
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
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
