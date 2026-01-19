 # Carbon Credit Marketplace

A comprehensive platform for farmers to register plantations, calculate carbon credits using satellite data, and for businesses to purchase these credits to offset their carbon emissions.

## View Live
(https://carboncredit-frontend.onrender.com/) 

## 🌟 Overview

The Carbon Credit Marketplace is a web-based platform that connects sustainable farmers with eco-conscious businesses. Farmers can register their plantations, upload images, and calculate carbon credits based on vegetation health using NDVI (Normalized Difference Vegetation Index) analysis from satellite data. Businesses can browse verified plantations and purchase carbon credits to offset their carbon footprint.

### Key Features

- **👨‍🌾 Farmer Dashboard**: Register and manage plantations, upload images, calculate NDVI, view carbon credits earned
- **🏢 Business Dashboard**: Browse verified plantations with images, purchase carbon credits, view purchase history
- **🔐 Admin Dashboard**: Review pending plantations, manually verify or reject based on documentation and satellite data
- **🛰️ Advanced Verification**: Plantations require image upload, NDVI calculation, and admin approval before being available for sale
- **📸 Image Tracking**: Store and display plantation images for verification
- **📍 Location Tracking**: Track plantation creation and verification timestamps
- **🗺️ Interactive Maps**: Visualize plantations on Leaflet maps with NDVI overlays
- **🔒 Secure Authentication**: Username/password based login with header-based auth for demo
- **💾 Database**: SQLite backend with tables for users, plantations, and transactions
- **☁️ Cloud Storage**: Cloudinary integration for image storage
- **📧 Email Integration**: Contact form with email notifications

## 🛠️ Tech Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: SQLAlchemy
- **Authentication**: Werkzeug security
- **CORS**: Flask-CORS
- **Email**: Flask-Mail
- **Cloud Storage**: Cloudinary API

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Responsive design with custom properties
- **JavaScript**: Vanilla JS with modern ES6+ features
- **Maps**: Leaflet.js for interactive mapping
- **Icons**: Unicode emojis and custom SVG

### External Services
- **Satellite Data**: Sentinel-2 via Copernicus Open Access Hub
- **Image Processing**: Rasterio, NumPy, Matplotlib
- **Cloud Storage**: Cloudinary (25GB free tier)

## 📁 Project Structure

```
carbon-credit-marketplace/
├── backend/
│   ├── app.py              # Flask application entry point
│   ├── models.py           # Database models (Farmer, Business, Plantation, CarbonCredit)
│   ├── routes.py           # API endpoints and business logic
│   ├── utils.py            # Utility functions (credit calculation)
│   ├── cloud_storage.py    # Cloudinary integration for image uploads
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── frontend/
│   ├── index.html          # Landing page with login/register
│   ├── farmer_dashboard.html
│   ├── business_dashboard.html
│   ├── admin_dashboard.html
│   ├── contact.html        # Contact form page
│   ├── documentation.html  # User documentation
│   ├── privacy.html        # Privacy policy
│   ├── ndvi_guide.html     # NDVI explanation guide
│   ├── styles.css          # Responsive CSS styling
│   ├── app.js              # Landing page JavaScript
│   ├── farmer.js           # Farmer dashboard logic
│   ├── business.js         # Business dashboard logic
│   ├── admin.js            # Admin dashboard logic
│   └── map.js              # Leaflet map integration
├── scripts/                # (Future) Satellite data processing scripts
└── README.md
```

## 🚀 Setup and Installation

### Prerequisites

- **Python 3.8+**: Download from [python.org](https://python.org)
- **Git**: Version control system
- **Web Browser**: Modern browser with JavaScript enabled
- **Internet Connection**: For cloud services and satellite data

### Option 1: Local Development (SQLite)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd carbon-credit-marketplace
   ```

2. **Set Up Backend**
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Run the Application**
   ```bash
   python app.py
   ```
   The API will be available at `http://localhost:5000`

4. **Set Up Frontend**
   ```bash
   cd ../frontend
   # Option A: Use Python's built-in server
   python -m http.server 8000
   # Option B: Use Node.js (if installed)
   npx serve . -p 8000
   ```
   Access the frontend at `http://localhost:8000`

### Option 2: Cloud Deployment (PostgreSQL + Cloudinary)

1. **Set Up PostgreSQL Database**
   - **Recommended**: [Supabase](https://supabase.com) (Free tier: 500MB)
   - **Alternatives**: [Neon](https://neon.tech), [Railway](https://railway.app)
   - Create a new project and copy the connection string

2. **Set Up Cloudinary for Images**
   - Sign up at [Cloudinary](https://cloudinary.com/users/register/free)
   - Get your Cloud Name, API Key, and API Secret

3. **Configure Environment Variables**
   ```bash
   cd backend
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   # Database (from Supabase/Neon/Railway)
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

   # Cloudinary (from Dashboard)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Flask Secret Key (generate random string)
   SECRET_KEY=your-random-secret-key-here

   # Email Configuration (optional)
   MAIL_USERNAME=your-gmail@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_DEFAULT_SENDER=noreply@carboncredit.com
   ```

4. **Install Dependencies and Run**
   ```bash
   pip install -r requirements.txt
   python app.py
   ```

### Email Setup (Optional)

To enable the contact form:

1. Enable 2-Factor Authentication on Gmail
2. Generate an App Password in Google Account settings
3. Add the credentials to your `.env` file
4. Uncomment email sending code in `backend/routes.py`

## 📖 Usage Guide

### For Farmers

1. **Register**: Create an account on the landing page
2. **Login**: Access your farmer dashboard
3. **Add Plantation**: Provide location coordinates, tree type, and area
4. **Upload Image**: Add a plantation photo for verification
5. **Calculate NDVI**: Use satellite data to compute vegetation health
6. **Monitor Credits**: View earned carbon credits and transaction history

### For Businesses

1. **Register**: Create a business account
2. **Browse Plantations**: View verified plantations with images and details
3. **Purchase Credits**: Buy carbon credits to offset emissions
4. **Track History**: Monitor your purchase history and impact

### For Admins

1. **Login**: Use admin password "admin123" on the landing page
2. **Review Plantations**: Check pending submissions with images and data
3. **Verify/Reject**: Manually approve or reject based on documentation
4. **Monitor System**: View all users, plantations, and transactions

## 🔌 API Documentation

### Authentication
All API requests require authentication headers:
```
Authorization: Bearer <token>
```

### Farmer Endpoints

- `POST /farmer/register` - Register new farmer
- `POST /farmer/login` - Login farmer
- `GET /farmer/plantations` - Get farmer's plantations
- `POST /farmer/plantations` - Add new plantation
- `PUT /farmer/plantations/<id>` - Update plantation
- `DELETE /farmer/plantations/<id>` - Delete plantation
- `POST /farmer/plantations/<id>/update_ndvi` - Update NDVI and credits
- `GET /farmer/credits` - Get total credits

### Business Endpoints

- `POST /business/register` - Register new business
- `POST /business/login` - Login business
- `GET /business/plantations` - Get verified plantations
- `POST /business/buy` - Purchase carbon credits
- `GET /business/purchases` - Get purchase history

### Admin Endpoints

- `POST /admin/verify/<id>/<status>` - Verify/reject plantation
- `GET /admin/plantations` - Get all plantations
- `GET /admin/stats` - Get system statistics

### General Endpoints

- `GET /uploads/<filename>` - Serve uploaded images
- `POST /contact` - Send contact form message

## 🧮 Carbon Credit Calculation

Credits are calculated using the formula:
```
Credits = Area (hectares) × NDVI × Constant Factor (100)
```

- **NDVI**: Normalized Difference Vegetation Index (0.0 to 1.0)
- **Area**: Plantation area in hectares
- **Constant Factor**: 100 (adjustable based on carbon sequestration models)

Higher NDVI values indicate healthier vegetation and result in more credits.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | No (falls back to SQLite) |
| `SECRET_KEY` | Flask secret key | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No (local storage fallback) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No |
| `MAIL_USERNAME` | Gmail username for email | No |
| `MAIL_PASSWORD` | Gmail app password | No |

### Database Models

- **Farmer**: User management, credit tracking
- **Business**: User management, purchase tracking
- **Plantation**: Plantation details, verification status, images
- **CarbonCredit**: Transaction records between farmers and businesses

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `DATABASE_URL` format
   - Ensure database is accessible
   - Verify credentials are correct

2. **Image Upload Issues**
   - Check Cloudinary credentials
   - Ensure internet connection
   - Verify file size limits (10MB default)

3. **Email Not Sending**
   - Verify Gmail credentials
   - Check 2FA is enabled
   - Use app password, not regular password

4. **NDVI Calculation Errors**
   - Ensure coordinates are valid
   - Check satellite data availability
   - Verify GDAL installation for local processing

### Development Tips

- Use `python app.py` for development with auto-reload
- Check browser console for frontend errors
- Monitor Flask console for backend logs
- Use SQLite for quick testing, PostgreSQL for production

## 🚀 Deployment

### Local Deployment
```bash
# Backend
cd backend
python app.py

# Frontend (separate terminal)
cd frontend
python -m http.server 8000
```

### Production Deployment Options

1. **Heroku**: Push backend to Heroku, serve frontend statically
2. **Railway**: Deploy both backend and database
3. **Vercel/Netlify**: Deploy frontend, backend to separate service
4. **Docker**: Containerize the entire application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Sentinel-2 data provided by Copernicus Open Access Hub
- Leaflet.js for mapping functionality
- Cloudinary for image storage
- Open source community for various libraries

## 📞 Support

- **Documentation**: Check the `frontend/documentation.html` page
- **Issues**: Create an issue on GitHub
- **Contact**: Use the contact form at `frontend/contact.html`

---

**Built with ❤️ for a sustainable future**
