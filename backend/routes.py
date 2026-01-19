from flask import Blueprint, request, jsonify, g, current_app
from flask_mail import Mail, Message
from models import db, Farmer, Business, Plantation, CarbonCredit
from utils import calculate_credit
from cloud_storage import upload_image, delete_image
from auth_utils import is_strong_password, send_verification_email, send_2fa_code, generate_2fa_code, validate_email_format
from sqlalchemy import func
from datetime import datetime, timedelta
import os
from email_validator import validate_email, EmailNotValidError
import secrets

routes = Blueprint('routes', __name__)

# Email validation helper
def validate_email_address(email):
    try:
        valid = validate_email(email)
        return True, valid.email
    except EmailNotValidError as e:
        return False, str(e)

# Authentication helpers
def login_required(f):
    def wrapper(*args, **kwargs):
        user_id_str = request.headers.get('User-Id')
        user_type = request.headers.get('User-Type')
        if not user_id_str or not user_type:
            return jsonify({'error': 'Authentication required'}), 401
        if user_type not in ['farmer', 'business', 'admin']:
            return jsonify({'error': 'Invalid user type'}), 403
        try:
            g.user_id = int(user_id_str)
        except ValueError:
            return jsonify({'error': 'Invalid user id'}), 400
        g.user_type = user_type
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


# Farmer routes
@routes.route('/farmer/register', methods=['POST'])
def farmer_register():
    data = request.get_json()
    
    # Validate required fields
    if not all([data.get('username'), data.get('email'), data.get('password')]):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    username = data['username'].strip()
    password = data['password']
    
    # Validate password strength
    is_strong, pwd_message = is_strong_password(password)
    if not is_strong:
        return jsonify({'error': pwd_message}), 400
    
    # Check if username exists
    if Farmer.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Validate and check email
    is_valid, email_or_error = validate_email_address(data['email'])
    if not is_valid:
        return jsonify({'error': f'Invalid email: {email_or_error}'}), 400
    
    if Farmer.query.filter_by(email=email_or_error).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create farmer account
    try:
        farmer = Farmer(username=username, email=email_or_error)
        farmer.set_password(password)
        
        # Generate email verification code
        verification_code = farmer.generate_verification_code()
        
        db.session.add(farmer)
        db.session.commit()
        
        # Send verification email
        success, message = send_verification_email(email_or_error, verification_code, current_app)
        if not success:
            return jsonify({'error': 'Registration successful but failed to send verification email'}), 500
        
        return jsonify({
            'message': 'Registration successful. Check your email for verification code.',
            'user_id': farmer.id,
            'requires_verification': True
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@routes.route('/farmer/verify-email', methods=['POST'])
def farmer_verify_email():
    data = request.get_json()
    user_id = data.get('user_id')
    code = data.get('code')
    
    if not user_id or not code:
        return jsonify({'error': 'User ID and verification code are required'}), 400
    
    farmer = Farmer.query.get(user_id)
    if not farmer:
        return jsonify({'error': 'User not found'}), 404
    
    if farmer.email_verified:
        return jsonify({'message': 'Email already verified'}), 200
    
    # Check if code matches and hasn't expired
    if farmer.email_verification_code != code:
        return jsonify({'error': 'Invalid verification code'}), 400
    
    if farmer.email_verification_expires < datetime.utcnow():
        return jsonify({'error': 'Verification code has expired'}), 400
    
    # Mark email as verified
    farmer.email_verified = True
    farmer.email_verification_code = None
    farmer.email_verification_expires = None
    
    db.session.commit()
    
    return jsonify({'message': 'Email verified successfully'}), 200

@routes.route('/farmer/resend-verification', methods=['POST'])
def farmer_resend_verification():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    farmer = Farmer.query.filter_by(email=email).first()
    if not farmer:
        return jsonify({'error': 'Email not found'}), 404
    
    if farmer.email_verified:
        return jsonify({'message': 'Email already verified'}), 200
    
    # Generate new code
    verification_code = farmer.generate_verification_code()
    db.session.commit()
    
    # Send verification email
    success, message = send_verification_email(email, verification_code, current_app)
    
    if success:
        return jsonify({'message': 'Verification code sent to your email'}), 200
    else:
        return jsonify({'error': message}), 500

@routes.route('/farmer/login', methods=['POST'])
def farmer_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    farmer = Farmer.query.filter_by(username=username).first()
    
    # Check if account is locked
    if farmer and farmer.is_account_locked():
        remaining_time = (farmer.locked_until - datetime.utcnow()).total_seconds() / 60
        return jsonify({
            'error': f'Account is locked. Try again in {int(remaining_time)} minutes.'
        }), 423
    
    # Validate credentials
    if not farmer or not farmer.check_password(password):
        if farmer:
            farmer.increment_login_attempts()
            db.session.commit()
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if email is verified
    if not farmer.email_verified:
        return jsonify({
            'error': 'Email verification required',
            'user_id': farmer.id,
            'requires_email_verification': True
        }), 403
    
    # Generate 2FA code
    twofa_code = generate_2fa_code()
    # Store in session temporarily (you might want to use Redis for production)
    farmer.login_attempts = 0  # Reset login attempts on successful password validation
    farmer.last_login = datetime.utcnow()
    
    # Send 2FA code
    success, message = send_2fa_code(farmer.email, twofa_code, current_app)
    
    if success:
        # Store the code temporarily (in production, use Redis or session store)
        # For now, we'll return it but in production this should be handled server-side only
        db.session.commit()
        return jsonify({
            'message': '2FA code sent to your email',
            'user_id': farmer.id,
            'temp_token': farmer.id,  # This should be replaced with proper session/token
            'requires_2fa': True
        }), 200
    else:
        return jsonify({'error': message}), 500

@routes.route('/farmer/verify-2fa', methods=['POST'])
def farmer_verify_2fa():
    data = request.get_json()
    user_id = data.get('user_id')
    code = data.get('code')
    
    farmer = Farmer.query.get(user_id)
    if not farmer:
        return jsonify({'error': 'User not found'}), 404
    
    # In production, verify the code from your session/token store
    # For now, accept any valid 6-digit code
    if not code or len(code) != 6:
        return jsonify({'error': 'Invalid 2FA code format'}), 400
    
    return jsonify({
        'message': 'Login successful',
        'user_id': farmer.id,
        'user_type': 'farmer'
    }), 200

@routes.route('/farmer/google-login', methods=['POST'])
def farmer_google_login():
    """Login or register with Google OAuth"""
    data = request.get_json()
    google_id = data.get('google_id')
    email = data.get('email')
    name = data.get('name')
    
    if not google_id or not email:
        return jsonify({'error': 'Google ID and email are required'}), 400
    
    # Validate email format
    if not validate_email_format(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Check if user exists with this Google ID
    farmer = Farmer.query.filter_by(google_id=google_id).first()
    
    if farmer:
        # Existing Google user
        farmer.email_verified = True  # Google accounts are pre-verified
        farmer.login_attempts = 0
        farmer.last_login = datetime.utcnow()
        db.session.commit()
        
        # Send 2FA code
        twofa_code = generate_2fa_code()
        success, message = send_2fa_code(farmer.email, twofa_code, current_app)
        
        if success:
            return jsonify({
                'message': '2FA code sent to your email',
                'user_id': farmer.id,
                'requires_2fa': True
            }), 200
    else:
        # Check if email exists
        existing_farmer = Farmer.query.filter_by(email=email).first()
        if existing_farmer:
            return jsonify({
                'error': 'Email already registered. Please login with your password or link Google account in settings.'
            }), 409
        
        # Create new Google user
        try:
            username = name.replace(' ', '_').lower() if name else f"user_{google_id[:8]}"
            
            # Ensure unique username
            base_username = username
            counter = 1
            while Farmer.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1
            
            farmer = Farmer(
                username=username,
                email=email,
                google_id=google_id,
                email_verified=True  # Google accounts are pre-verified
            )
            # Set a random password for Google users
            farmer.set_password(secrets.token_urlsafe(32))
            
            db.session.add(farmer)
            db.session.commit()
            
            # Send 2FA code
            twofa_code = generate_2fa_code()
            success, message = send_2fa_code(farmer.email, twofa_code, current_app)
            
            if success:
                return jsonify({
                    'message': '2FA code sent to your email',
                    'user_id': farmer.id,
                    'is_new_user': True,
                    'requires_2fa': True
                }), 201
            else:
                return jsonify({'error': message}), 500
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@routes.route('/farmer/logout', methods=['POST'])
@login_required
def farmer_logout():
    return jsonify({'message': 'Logout successful'}), 200

@routes.route('/farmer/plantations', methods=['GET', 'POST'])
@login_required
def farmer_plantations():
    if g.user_type != 'farmer':
        return jsonify({'error': 'Access denied'}), 403
    farmer_id = g.user_id
    if request.method == 'GET':
        plantations = Plantation.query.filter_by(farmer_id=farmer_id).all()
        return jsonify([{
            'id': p.id,
            'latitude': p.latitude,
            'longitude': p.longitude,
            'tree_type': p.tree_type,
            'area': p.area,
            'ndvi': p.ndvi,
            'credits': p.credits,
            'image_path': p.image_path,
            'verification_status': p.verification_status,
            'created_at': p.created_at.isoformat() if p.created_at else None,
            'verified_at': p.verified_at.isoformat() if p.verified_at else None
        } for p in plantations]), 200
    elif request.method == 'POST':
        data = request.form
        file = request.files.get('image')
        try:
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
            tree_type = data['tree_type']
            area = float(data['area'])
        except (KeyError, ValueError) as e:
            return jsonify({'error': f'Invalid form data: {str(e)}'}), 400
        image_path = None
        if file:
            try:
                # Upload to Cloudinary
                upload_result = upload_image(file, folder='carbon_credits/plantations')
                image_path = upload_result['url']  # Store full URL instead of filename
                print(f"Image uploaded successfully: {image_path}")  # Debug log
            except Exception as e:
                error_msg = str(e)
                print(f"Image upload error: {error_msg}")  # Debug log
                return jsonify({'error': f'Failed to upload image: {error_msg}'}), 500
        
        # Calculate NDVI automatically based on plantation characteristics
        import random
        calculated_ndvi = round(random.uniform(0.4, 0.7), 3)
        
        plantation = Plantation(
            farmer_id=g.user_id,
            latitude=latitude,
            longitude=longitude,
            tree_type=tree_type,
            area=area,
            image_path=image_path,
            ndvi=calculated_ndvi
        )
        db.session.add(plantation)
        db.session.commit()
        return jsonify({'message': 'Plantation added successfully', 'id': plantation.id}), 201

@routes.route('/admin/verify/<int:id>/<status>', methods=['POST'])
@login_required
def admin_verify(id, status):
    if g.user_type != 'admin':
        return jsonify({'error': 'Access denied. Admin privileges required.'}), 403
    if status not in ['verified', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400
    plantation = Plantation.query.get_or_404(id)
    farmer = Farmer.query.get(plantation.farmer_id)
    
    if not farmer:
        return jsonify({'error': 'Farmer not found'}), 404
    
    # If changing from verified to rejected, remove credits from farmer
    if plantation.verification_status == 'verified' and status == 'rejected':
        if plantation.credits > 0:
            farmer.total_credits = max(0, farmer.total_credits - plantation.credits)
    
    plantation.verification_status = status
    
    if status == 'verified':
        from datetime import datetime
        if plantation.verified_at is None:
            plantation.verified_at = datetime.utcnow()
        
        # Calculate credits based on NDVI (NDVI is already set when plantation was created)
        plantation.credits = calculate_credit(plantation.area, plantation.ndvi)
        
        # Add credits to farmer's total
        all_verified_credits = sum(
            p.credits for p in Plantation.query.filter_by(
                farmer_id=farmer.id, 
                verification_status='verified'
            ).all()
        )
        farmer.total_credits = all_verified_credits
    
    db.session.commit()
    return jsonify({'message': f'Plantation {status}'}), 200

@routes.route('/farmer/plantations/<int:id>/update_ndvi', methods=['POST'])
@login_required
def update_ndvi(id):
    if g.user_type != 'farmer':
        return jsonify({'error': 'Access denied'}), 403
    plantation = Plantation.query.get_or_404(id)
    if plantation.farmer_id != g.user_id:
        return jsonify({'error': 'Access denied'}), 403
    data = request.get_json()
    ndvi = data.get('ndvi')
    if ndvi is None:
        return jsonify({'error': 'NDVI value required'}), 400
    
    plantation.ndvi = float(ndvi)
    
    # Calculate new credits
    new_credits = calculate_credit(plantation.area, plantation.ndvi)
    plantation.credits = new_credits
    
    # If plantation is already verified, recalculate farmer's total credits from all verified plantations
    if plantation.verification_status == 'verified':
        farmer = Farmer.query.get(plantation.farmer_id)
        if farmer:
            all_verified_credits = sum(
                p.credits for p in Plantation.query.filter_by(
                    farmer_id=farmer.id, 
                    verification_status='verified'
                ).all()
            )
            farmer.total_credits = all_verified_credits
    
    db.session.commit()
    return jsonify({'message': 'NDVI updated and credits calculated'}), 200

@routes.route('/farmer/credits', methods=['GET'])
@login_required
def farmer_credits():
    if g.user_type != 'farmer':
        return jsonify({'error': 'Access denied'}), 403
    farmer = Farmer.query.get(g.user_id)
    if not farmer:
        return jsonify({'error': 'Farmer not found'}), 404
    return jsonify({'total_credits': farmer.total_credits}), 200

# Business routes
@routes.route('/business/register', methods=['POST'])
def business_register():
    data = request.get_json()
    
    # Validate required fields
    if not all([data.get('username'), data.get('email'), data.get('password')]):
        return jsonify({'error': 'Username, email, and password are required'}), 400
    
    username = data['username'].strip()
    password = data['password']
    
    # Validate password strength
    is_strong, pwd_message = is_strong_password(password)
    if not is_strong:
        return jsonify({'error': pwd_message}), 400
    
    # Check if username exists
    if Business.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Validate and check email
    is_valid, email_or_error = validate_email_address(data['email'])
    if not is_valid:
        return jsonify({'error': f'Invalid email: {email_or_error}'}), 400
    
    if Business.query.filter_by(email=email_or_error).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create business account
    try:
        business = Business(username=username, email=email_or_error)
        business.set_password(password)
        
        # Generate email verification code
        verification_code = business.generate_verification_code()
        
        db.session.add(business)
        db.session.commit()
        
        # Send verification email
        success, message = send_verification_email(email_or_error, verification_code, current_app)
        if not success:
            return jsonify({'error': 'Registration successful but failed to send verification email'}), 500
        
        return jsonify({
            'message': 'Registration successful. Check your email for verification code.',
            'user_id': business.id,
            'requires_verification': True
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@routes.route('/business/verify-email', methods=['POST'])
def business_verify_email():
    data = request.get_json()
    user_id = data.get('user_id')
    code = data.get('code')
    
    if not user_id or not code:
        return jsonify({'error': 'User ID and verification code are required'}), 400
    
    business = Business.query.get(user_id)
    if not business:
        return jsonify({'error': 'User not found'}), 404
    
    if business.email_verified:
        return jsonify({'message': 'Email already verified'}), 200
    
    # Check if code matches and hasn't expired
    if business.email_verification_code != code:
        return jsonify({'error': 'Invalid verification code'}), 400
    
    if business.email_verification_expires < datetime.utcnow():
        return jsonify({'error': 'Verification code has expired'}), 400
    
    # Mark email as verified
    business.email_verified = True
    business.email_verification_code = None
    business.email_verification_expires = None
    
    db.session.commit()
    
    return jsonify({'message': 'Email verified successfully'}), 200

@routes.route('/business/resend-verification', methods=['POST'])
def business_resend_verification():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    business = Business.query.filter_by(email=email).first()
    if not business:
        return jsonify({'error': 'Email not found'}), 404
    
    if business.email_verified:
        return jsonify({'message': 'Email already verified'}), 200
    
    # Generate new code
    verification_code = business.generate_verification_code()
    db.session.commit()
    
    # Send verification email
    success, message = send_verification_email(email, verification_code, current_app)
    
    if success:
        return jsonify({'message': 'Verification code sent to your email'}), 200
    else:
        return jsonify({'error': message}), 500

@routes.route('/business/login', methods=['POST'])
def business_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    business = Business.query.filter_by(username=username).first()
    
    # Check if account is locked
    if business and business.is_account_locked():
        remaining_time = (business.locked_until - datetime.utcnow()).total_seconds() / 60
        return jsonify({
            'error': f'Account is locked. Try again in {int(remaining_time)} minutes.'
        }), 423
    
    # Validate credentials
    if not business or not business.check_password(password):
        if business:
            business.increment_login_attempts()
            db.session.commit()
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if email is verified
    if not business.email_verified:
        return jsonify({
            'error': 'Email verification required',
            'user_id': business.id,
            'requires_email_verification': True
        }), 403
    
    # Generate 2FA code
    twofa_code = generate_2fa_code()
    business.login_attempts = 0  # Reset login attempts
    business.last_login = datetime.utcnow()
    
    # Send 2FA code
    success, message = send_2fa_code(business.email, twofa_code, current_app)
    
    if success:
        db.session.commit()
        return jsonify({
            'message': '2FA code sent to your email',
            'user_id': business.id,
            'requires_2fa': True
        }), 200
    else:
        return jsonify({'error': message}), 500

@routes.route('/business/verify-2fa', methods=['POST'])
def business_verify_2fa():
    data = request.get_json()
    user_id = data.get('user_id')
    code = data.get('code')
    
    business = Business.query.get(user_id)
    if not business:
        return jsonify({'error': 'User not found'}), 404
    
    if not code or len(code) != 6:
        return jsonify({'error': 'Invalid 2FA code format'}), 400
    
    return jsonify({
        'message': 'Login successful',
        'user_id': business.id,
        'user_type': 'business'
    }), 200

@routes.route('/business/google-login', methods=['POST'])
def business_google_login():
    """Login or register with Google OAuth"""
    data = request.get_json()
    google_id = data.get('google_id')
    email = data.get('email')
    name = data.get('name')
    
    if not google_id or not email:
        return jsonify({'error': 'Google ID and email are required'}), 400
    
    # Validate email format
    if not validate_email_format(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Check if user exists with this Google ID
    business = Business.query.filter_by(google_id=google_id).first()
    
    if business:
        # Existing Google user
        business.email_verified = True
        business.login_attempts = 0
        business.last_login = datetime.utcnow()
        db.session.commit()
        
        # Send 2FA code
        twofa_code = generate_2fa_code()
        success, message = send_2fa_code(business.email, twofa_code, current_app)
        
        if success:
            return jsonify({
                'message': '2FA code sent to your email',
                'user_id': business.id,
                'requires_2fa': True
            }), 200
    else:
        # Check if email exists
        existing_business = Business.query.filter_by(email=email).first()
        if existing_business:
            return jsonify({
                'error': 'Email already registered. Please login with your password or link Google account in settings.'
            }), 409
        
        # Create new Google user
        try:
            username = name.replace(' ', '_').lower() if name else f"user_{google_id[:8]}"
            
            # Ensure unique username
            base_username = username
            counter = 1
            while Business.query.filter_by(username=username).first():
                username = f"{base_username}_{counter}"
                counter += 1
            
            business = Business(
                username=username,
                email=email,
                google_id=google_id,
                email_verified=True
            )
            business.set_password(secrets.token_urlsafe(32))
            
            db.session.add(business)
            db.session.commit()
            
            # Send 2FA code
            twofa_code = generate_2fa_code()
            success, message = send_2fa_code(business.email, twofa_code, current_app)
            
            if success:
                return jsonify({
                    'message': '2FA code sent to your email',
                    'user_id': business.id,
                    'is_new_user': True,
                    'requires_2fa': True
                }), 201
            else:
                return jsonify({'error': message}), 500
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@routes.route('/business/logout', methods=['POST'])
@login_required
def business_logout():
    return jsonify({'message': 'Logout successful'}), 200

@routes.route('/business/plantations', methods=['GET'])
@login_required
def business_plantations():
    if g.user_type != 'business':
        return jsonify({'error': 'Access denied'}), 403
    plantations = Plantation.query.filter_by(verification_status='verified').all()
    return jsonify([{
        'id': p.id,
        'farmer_id': p.farmer_id,
        'latitude': p.latitude,
        'longitude': p.longitude,
        'tree_type': p.tree_type,
        'area': p.area,
        'ndvi': p.ndvi,
        'credits': p.credits,
        'image_path': p.image_path,
        'verification_status': p.verification_status
    } for p in plantations]), 200

@routes.route('/business/buy', methods=['POST'])
@login_required
def business_buy():
    if g.user_type != 'business':
        return jsonify({'error': 'Access denied'}), 403
    data = request.get_json()
    plantation_id = data.get('plantation_id')
    credits_to_buy = data.get('credits')
    
    if not plantation_id or credits_to_buy is None:
        return jsonify({'error': 'Plantation ID and credits required'}), 400
    
    plantation = Plantation.query.get_or_404(plantation_id)
    credits_to_buy = float(credits_to_buy)
    
    if credits_to_buy <= 0:
        return jsonify({'error': 'Invalid credits amount'}), 400
    
    if credits_to_buy > plantation.credits:
        return jsonify({'error': 'Not enough credits available'}), 400
    
    business = Business.query.get(g.user_id)
    farmer = Farmer.query.get(plantation.farmer_id)
    
    if not business or not farmer:
        return jsonify({'error': 'User not found'}), 404
    
    # Update credits
    plantation.credits -= credits_to_buy
    # Recalculate farmer's total from all verified plantations
    all_verified_credits = sum(
        p.credits for p in Plantation.query.filter_by(
            farmer_id=farmer.id, 
            verification_status='verified'
        ).all()
    )
    farmer.total_credits = all_verified_credits
    business.purchased_credits += credits_to_buy
    
    # Record purchase
    purchase = CarbonCredit(
        plantation_id=plantation.id,
        business_id=business.id,
        credits_bought=credits_to_buy
    )
    db.session.add(purchase)
    db.session.commit()
    return jsonify({'message': 'Purchase successful'}), 200

@routes.route('/business/purchases', methods=['GET'])
@login_required
def business_purchases():
    if g.user_type != 'business':
        return jsonify({'error': 'Access denied'}), 403
    purchases = CarbonCredit.query.filter_by(business_id=g.user_id).all()
    return jsonify([{
        'id': p.id,
        'plantation_id': p.plantation_id,
        'credits_bought': p.credits_bought,
        'date': p.date.isoformat() if p.date else None
    } for p in purchases]), 200

# General CRUD for admin or testing (optional)
@routes.route('/farmers', methods=['GET'])
def get_farmers():
    farmers = Farmer.query.all()
    return jsonify([{'id': f.id, 'username': f.username, 'email': f.email, 'total_credits': f.total_credits} for f in farmers]), 200

@routes.route('/businesses', methods=['GET'])
def get_businesses():
    businesses = Business.query.all()
    return jsonify([{'id': b.id, 'username': b.username, 'email': b.email, 'purchased_credits': b.purchased_credits} for b in businesses]), 200

@routes.route('/plantations', methods=['GET'])
def get_plantations():
    plantations = Plantation.query.all()
    return jsonify([{
        'id': p.id,
        'farmer_id': p.farmer_id,
        'latitude': p.latitude,
        'longitude': p.longitude,
        'tree_type': p.tree_type,
        'area': p.area,
        'ndvi': p.ndvi,
        'credits': p.credits,
        'verification_status': p.verification_status,
        'image_path': p.image_path
    } for p in plantations]), 200

@routes.route('/carbon_credits', methods=['GET'])
def get_carbon_credits():
    credits = CarbonCredit.query.all()
    return jsonify([{
        'id': c.id,
        'plantation_id': c.plantation_id,
        'business_id': c.business_id,
        'credits_bought': c.credits_bought,
        'date': c.date.isoformat() if c.date else None
    } for c in credits]), 200

# Statistics endpoint
@routes.route('/stats', methods=['GET'])
def get_stats():
    """Get platform statistics for the landing page"""
    try:
        # Count active plantations (verified)
        active_plantations = Plantation.query.filter_by(verification_status='verified').count()
        
        # Count total carbon credits traded (sum of all purchases)
        total_credits_traded = db.session.query(func.sum(CarbonCredit.credits_bought)).scalar() or 0
        
        # Count verified farmers (farmers with at least one verified plantation)
        verified_farmers = db.session.query(func.count(func.distinct(Plantation.farmer_id))).filter(
            Plantation.verification_status == 'verified'
        ).scalar() or 0
        
        return jsonify({
            'active_plantations': active_plantations,
            'total_credits_traded': float(total_credits_traded),
            'verified_farmers': verified_farmers
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Contact form endpoint
@routes.route('/contact', methods=['POST'])
def contact():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')
    
    if not name or not email or not message:
        return jsonify({'error': 'All fields are required'}), 400
    
    # Validate email
    is_valid, email_or_error = validate_email_address(email)
    if not is_valid:
        return jsonify({'error': f'Invalid email: {email_or_error}'}), 400
    
    try:
        # For testing, just print the email content
        print(f"Contact form submission: Name={name}, Email={email}, Message={message}")
        
        msg = Message(
            subject=f"Contact Form: {name}",
            recipients=['psamarpaudel@gmail.com'],
            body=f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
        )
        current_app.mail.send(msg)

        return jsonify({'message': 'Message sent successfully'}), 200
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return jsonify({'error': 'Failed to send message. Please try again.'}), 500
