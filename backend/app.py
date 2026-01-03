from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from models import db
from routes import routes
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here-change-in-production')

# Email configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@carboncredit.com')

mail = Mail(app)

# Database configuration - use PostgreSQL from environment variable
database_url = os.getenv('DATABASE_URL')
if database_url:
    # Replace postgres:// with postgresql:// for SQLAlchemy compatibility
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    # Fix common URL formatting issues
    # Remove any brackets or malformed characters in the URL
    import re
    # Fix URLs that might have brackets or other issues
    database_url = re.sub(r'[\[\]]', '', database_url)
    
    # Validate URL format
    try:
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        if not parsed.hostname:
            raise ValueError("Invalid DATABASE_URL format")
    except Exception as e:
        print(f"Warning: Invalid DATABASE_URL format: {str(e)}")
        print("Falling back to SQLite database.")
        database_url = None
    
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(os.getcwd(), "carbon_credit_new.db")}'
        print("Warning: DATABASE_URL invalid. Using SQLite database.")
else:
    # Fallback to SQLite if DATABASE_URL not set (for development)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(os.getcwd(), "carbon_credit_new.db")}'
    print("Warning: DATABASE_URL not set. Using SQLite database.")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, supports_credentials=True)
db.init_app(app)
app.register_blueprint(routes)

# Pass mail to routes
app.mail = mail

# Configure Cloudinary
from cloud_storage import configure_cloudinary
try:
    configure_cloudinary()
    print("Cloudinary configured successfully")
except Exception as e:
    print(f"Warning: Cloudinary not configured: {str(e)}")
    print("Image uploads will fail. Please set CLOUDINARY_* environment variables.")

with app.app_context():
    db.create_all()
    print("Database tables created")

if __name__ == '__main__':
    app.run(debug=True)
