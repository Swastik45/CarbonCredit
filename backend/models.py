from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets

db = SQLAlchemy()

class Farmer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_code = db.Column(db.String(6), nullable=True)
    email_verification_expires = db.Column(db.DateTime, nullable=True)
    total_credits = db.Column(db.Float, default=0.0)
    google_id = db.Column(db.String(255), unique=True, nullable=True)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(32), nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    plantations = db.relationship('Plantation', backref='farmer', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_verification_code(self):
        """Generate a 6-digit verification code"""
        code = secrets.randbelow(1000000)
        self.email_verification_code = f"{code:06d}"
        self.email_verification_expires = datetime.utcnow() + timedelta(minutes=15)
        return self.email_verification_code
    
    def is_account_locked(self):
        """Check if account is locked due to failed login attempts"""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    def increment_login_attempts(self):
        """Increment login attempts and lock account if needed"""
        self.login_attempts += 1
        if self.login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=30)

class Business(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_code = db.Column(db.String(6), nullable=True)
    email_verification_expires = db.Column(db.DateTime, nullable=True)
    purchased_credits = db.Column(db.Float, default=0.0)
    google_id = db.Column(db.String(255), unique=True, nullable=True)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(32), nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    purchases = db.relationship('CarbonCredit', backref='business', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_verification_code(self):
        """Generate a 6-digit verification code"""
        code = secrets.randbelow(1000000)
        self.email_verification_code = f"{code:06d}"
        self.email_verification_expires = datetime.utcnow() + timedelta(minutes=15)
        return self.email_verification_code
    
    def is_account_locked(self):
        """Check if account is locked due to failed login attempts"""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False
    
    def increment_login_attempts(self):
        """Increment login attempts and lock account if needed"""
        self.login_attempts += 1
        if self.login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=30)

class Plantation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('farmer.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    tree_type = db.Column(db.String(100), nullable=False)
    area = db.Column(db.Float, nullable=False)  # in hectares
    ndvi = db.Column(db.Float, default=0.0)
    credits = db.Column(db.Float, default=0.0)
    image_path = db.Column(db.String(200), nullable=True)
    verification_status = db.Column(db.String(20), default='pending')  # pending, verified, rejected
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    verified_at = db.Column(db.DateTime, nullable=True)

class CarbonCredit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plantation_id = db.Column(db.Integer, db.ForeignKey('plantation.id'), nullable=False)
    business_id = db.Column(db.Integer, db.ForeignKey('business.id'), nullable=False)
    credits_bought = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, default=db.func.current_timestamp())

    plantation = db.relationship('Plantation', backref='sales', lazy=True)
