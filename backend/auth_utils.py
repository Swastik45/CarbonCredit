"""Authentication utilities for secure login and verification"""
import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import re

def is_strong_password(password):
    """
    Validate password strength.
    Requirements:
    - At least 12 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)"
    return True, "Password is strong"

def send_verification_email(email, code, app):
    """Send email verification code"""
    try:
        from flask_mail import Mail, Message
        mail = Mail(app)
        
        subject = "Email Verification - Carbon Credit Marketplace"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                    <h2 style="color: #2c5f2d; text-align: center;">Verify Your Email</h2>
                    <p>Thank you for registering with Carbon Credit Marketplace!</p>
                    <p>Your email verification code is:</p>
                    <div style="background-color: #2c5f2d; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="margin: 0; letter-spacing: 5px; font-size: 32px;">{code}</h1>
                    </div>
                    <p style="color: #666;">This code will expire in 15 minutes.</p>
                    <p style="color: #666;">If you didn't request this verification, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">© 2026 Carbon Credit Marketplace. All rights reserved.</p>
                </div>
            </body>
        </html>
        """
        
        msg = Message(
            subject=subject,
            recipients=[email],
            html=html_body
        )
        mail.send(msg)
        return True, "Verification email sent successfully"
    except Exception as e:
        print(f"Email sending error: {str(e)}")
        return False, f"Failed to send email: {str(e)}"

def send_2fa_code(email, code, app):
    """Send 2FA code via email"""
    try:
        from flask_mail import Mail, Message
        mail = Mail(app)
        
        subject = "Your Login Verification Code"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                    <h2 style="color: #2c5f2d; text-align: center;">Login Verification</h2>
                    <p>Someone is trying to login to your account. Use the code below to complete the login:</p>
                    <div style="background-color: #2c5f2d; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="margin: 0; letter-spacing: 5px; font-size: 32px;">{code}</h1>
                    </div>
                    <p style="color: #666;"><strong>This code will expire in 10 minutes.</strong></p>
                    <p style="color: #d9534f;"><strong>⚠️ If this wasn't you, please secure your account immediately.</strong></p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">© 2026 Carbon Credit Marketplace. All rights reserved.</p>
                </div>
            </body>
        </html>
        """
        
        msg = Message(
            subject=subject,
            recipients=[email],
            html=html_body
        )
        mail.send(msg)
        return True, "2FA code sent successfully"
    except Exception as e:
        print(f"Email sending error: {str(e)}")
        return False, f"Failed to send code: {str(e)}"

def generate_2fa_code():
    """Generate a 6-digit 2FA code"""
    code = secrets.randbelow(1000000)
    return f"{code:06d}"

def validate_email_format(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
