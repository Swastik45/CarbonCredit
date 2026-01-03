from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Farmer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    total_credits = db.Column(db.Float, default=0.0)

    plantations = db.relationship('Plantation', backref='farmer', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Business(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    purchased_credits = db.Column(db.Float, default=0.0)

    purchases = db.relationship('CarbonCredit', backref='business', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

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
