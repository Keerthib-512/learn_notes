import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
from core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        self.from_email = Email(settings.from_email, "Intellinotes")
    
    async def send_email(self, to_email: str, subject: str, content: str) -> bool:
        """Send email using SendGrid"""
        try:
            to_email_obj = To(to_email)
            content_obj = Content("text/html", content)
            
            mail = Mail(self.from_email, to_email_obj, subject, content_obj)
            
            response = self.sg.client.mail.send.post(request_body=mail.get())
            
            if response.status_code == 202:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email. Status code: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

# Global email service instance
email_service = EmailService()

async def send_otp_email(email: str, otp: str) -> bool:
    """Send OTP verification email"""
    subject = "Verify your Intellinotes account"
    
    content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5;">Intellinotes</h1>
                    <p style="color: #666;">Your notes, your pace, your intelligence</p>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Verify Your Account</h2>
                    <p style="margin-bottom: 20px;">Thank you for signing up for Intellinotes! Please use the verification code below to complete your registration:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="background: #4f46e5; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 5px; letter-spacing: 3px;">{otp}</span>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>If you didn't create an account with Intellinotes, please ignore this email.</p>
                    <p>&copy; 2024 Intellinotes. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    return await email_service.send_email(email, subject, content)

async def send_password_reset_email(email: str, reset_token: str) -> bool:
    """Send password reset email"""
    subject = "Reset your Intellinotes password"
    
    # In production, this would be your frontend URL
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}&email={email}"
    
    content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5;">Intellinotes</h1>
                    <p style="color: #666;">Your notes, your pace, your intelligence</p>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
                    <p style="margin-bottom: 20px;">We received a request to reset your password for your Intellinotes account.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
                    <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
                    <p style="color: #4f46e5; font-size: 12px; word-break: break-all;">{reset_url}</p>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>If you didn't request a password reset, please ignore this email.</p>
                    <p>&copy; 2024 Intellinotes. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    return await email_service.send_email(email, subject, content)

async def send_welcome_email(email: str, first_name: str) -> bool:
    """Send welcome email to new users"""
    subject = "Welcome to Intellinotes!"
    
    content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5;">Welcome to Intellinotes!</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello {first_name}!</h2>
                    <p style="margin-bottom: 20px;">Welcome to the future of learning! You're now ready to transform your documents into intelligent summaries, podcasts, and visual representations.</p>
                    
                    <h3 style="color: #4f46e5;">What you can do with Intellinotes:</h3>
                    <ul style="margin-left: 20px;">
                        <li>📄 Upload PDF, Word, and text documents</li>
                        <li>🤖 Generate AI-powered summaries</li>
                        <li>🎧 Convert summaries to audio podcasts</li>
                        <li>📊 Create visual flowcharts and diagrams</li>
                        <li>💾 Save and export your learning materials</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000/dashboard" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Start Learning</a>
                    </div>
                </div>
                
                <div style="text-align: center; color: #666; font-size: 12px;">
                    <p>Happy learning!</p>
                    <p>&copy; 2024 Intellinotes. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """
    
    return await email_service.send_email(email, subject, content) 