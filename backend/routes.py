from flask import Blueprint, request, jsonify, g, current_app
from flask_mail import Message
from models import db, Farmer, Business, Plantation, CarbonCredit
from utils import calculate_credit
from cloud_storage import upload_image, delete_image
from sqlalchemy import func
import os
from email_validator import validate_email, EmailNotValidError

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
    if Farmer.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Validate email
    is_valid, email_or_error = validate_email_address(data['email'])
    if not is_valid:
        return jsonify({'error': f'Invalid email: {email_or_error}'}), 400
    
    if Farmer.query.filter_by(email=email_or_error).first():
        return jsonify({'error': 'Email already exists'}), 400
    farmer = Farmer(username=data['username'], email=email_or_error)
    farmer.set_password(data['password'])
    try:
        db.session.add(farmer)
        db.session.commit()
        return jsonify({'message': 'Farmer registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed. Please try again.'}), 500

@routes.route('/farmer/login', methods=['POST'])
def farmer_login():
    data = request.get_json()
    farmer = Farmer.query.filter_by(username=data['username']).first()
    if farmer and farmer.check_password(data['password']):
        return jsonify({'message': 'Login successful', 'user_id': farmer.id, 'user_type': 'farmer'}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

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
        plantation = Plantation(
            farmer_id=g.user_id,
            latitude=latitude,
            longitude=longitude,
            tree_type=tree_type,
            area=area,
            image_path=image_path
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
        
        # Add credits to farmer's total (only if not already verified before)
        # We check if this plantation's credits are already in the farmer's total
        # by recalculating from all verified plantations
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
    if Business.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if Business.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    business = Business(username=data['username'], email=data['email'])
    business.set_password(data['password'])
    try:
        db.session.add(business)
        db.session.commit()
        return jsonify({'message': 'Business registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed. Please try again.'}), 500

@routes.route('/business/login', methods=['POST'])
def business_login():
    data = request.get_json()
    business = Business.query.filter_by(username=data['username']).first()
    if business and business.check_password(data['password']):
        return jsonify({'message': 'Login successful', 'user_id': business.id, 'user_type': 'business'}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

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
