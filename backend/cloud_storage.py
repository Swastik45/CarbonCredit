import cloudinary
import cloudinary.uploader
import cloudinary.api
from flask import current_app
import os

def configure_cloudinary():
    """Configure Cloudinary with credentials from environment variables"""
    cloudinary.config(
        cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
        api_key=os.getenv('CLOUDINARY_API_KEY'),
        api_secret=os.getenv('CLOUDINARY_API_SECRET')
    )

def upload_image(file, folder='carbon_credits'):
    """
    Upload an image to Cloudinary
    
    Args:
        file: File object from Flask request
        folder: Folder name in Cloudinary (default: 'carbon_credits')
    
    Returns:
        dict: Contains 'url' (image URL) and 'public_id' (Cloudinary ID)
    """
    # Check if Cloudinary is configured
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
    api_key = os.getenv('CLOUDINARY_API_KEY')
    api_secret = os.getenv('CLOUDINARY_API_SECRET')
    
    if not cloud_name or not api_key or not api_secret:
        raise Exception("Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file")
    
    try:
        configure_cloudinary()
        
        # Upload image to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type='image',
            transformation=[
                {'width': 1200, 'height': 800, 'crop': 'limit'},
                {'quality': 'auto'}
            ]
        )
        
        return {
            'url': result['secure_url'],
            'public_id': result['public_id']
        }
    except Exception as e:
        error_msg = str(e)
        if 'Invalid cloud_name' in error_msg or '401' in error_msg:
            raise Exception("Cloudinary authentication failed. Please check your API credentials in .env file")
        elif '403' in error_msg:
            raise Exception("Cloudinary access denied. Please check your API key permissions")
        else:
            raise Exception(f"Failed to upload image to Cloudinary: {error_msg}")

def delete_image(public_id):
    """
    Delete an image from Cloudinary
    
    Args:
        public_id: Cloudinary public_id of the image to delete
    """
    try:
        configure_cloudinary()
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"Failed to delete image: {str(e)}")

def get_image_url(public_id):
    """
    Get the URL of an image from Cloudinary
    
    Args:
        public_id: Cloudinary public_id
    
    Returns:
        str: Image URL
    """
    configure_cloudinary()
    return cloudinary.CloudinaryImage(public_id).build_url()

