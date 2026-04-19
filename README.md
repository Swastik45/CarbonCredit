# CarbonCredit - Next.js Full-Stack App

A modern, full-stack carbon credit marketplace built entirely with Next.js. Connect farmers, businesses, and administrators to verify and trade carbon credits using NDVI satellite data.

## Features

🌍 **Multi-Role Platform**
- **Farmers**: Register plantations, track carbon credits, manage submissions
- **Businesses**: Browse verified plantations, purchase carbon credits, view purchase history
- **Admins**: Review pending plantations, verify using NDVI data, manage credit issuance

🗺️ **Interactive Map**
- Leaflet-based map visualization of all plantations
- Real-time location tracking and plantation markers
- Clustered markers for better UX at different zoom levels

📊 **NDVI Verification**
- Comprehensive guide on Normalized Difference Vegetation Index
- Satellite-based vegetation health measurements
- Automated credit calculation based on NDVI scores

🔐 **Authentication**
- User registration and login with role-based access
- JWT-based session management
- Secure API endpoints with authentication headers

💾 **Full-Stack Data Management**
- API routes for farmers, businesses, and admin operations
- In-memory database with persistent data structures
- Real-time statistics and dashboard updates

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS 3
- **Maps**: Leaflet + React Leaflet
- **State Management**: React Hooks
- **API**: Next.js API Routes
- **Package Manager**: pnpm

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

```bash
cd nextjs-app
pnpm install
```

### Development Server

```bash
pnpm dev
```

Open [https://carbon-credit-opal.vercel.app/](https://carbon-credit-opal.vercel.app/) in your browser.

The app will auto-reload as you edit files.

### Production Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
nextjs-app/
├── app/
│   ├── layout.js              # Root layout with navigation
│   ├── page.js                # Home page with hero section
│   ├── globals.css            # Tailwind configuration & global styles
│   ├── login/page.js          # User login page
│   ├── register/page.js       # User registration page
│   ├── map/page.js            # Interactive plantation map
│   ├── ndvi-guide/page.js     # NDVI education guide
│   ├── farmer/page.js         # Farmer dashboard
│   ├── business/page.js       # Business dashboard
│   ├── contact/page.js        # Contact page
│   ├── documentation/page.js  # Documentation page
│   ├── privacy/page.js        # Privacy policy
│   ├── dashboard/
│   │   ├── farmer/page.js     # Farmer dashboard (route)
│   │   ├── business/page.js   # Business dashboard (route)
│   │   └── admin/page.js      # Admin dashboard (route)
│   └── api/
│       ├── auth/
│       │   ├── register.js    # Register endpoint
│       │   ├── login.js       # Login endpoint
│       │   └── logout.js      # Logout endpoint
│       ├── farmer/
│       │   ├── plantations.js # GET/POST plantations
│       │   └── credits.js     # GET farmer credits
│       ├── business/
│       │   ├── plantations.js # GET verified plantations
│       │   └── purchases.js   # GET/POST purchases
│       └── admin/
│           └── verify.js      # POST verify plantation
├── components/
│   └── MapComponent.js        # Leaflet map wrapper
├── lib/
│   └── db.js                  # In-memory database
├── public/                    # Static files
├── tailwind.config.js         # Tailwind theme config
├── postcss.config.js          # PostCSS configuration
├── next.config.js             # Next.js configuration
└── package.json               # Dependencies

```

## Role-Based Routes

### Farmers
- `/farmer` - Farmer dashboard
- `/dashboard/farmer` - Alternative dashboard view
- Add/manage plantations
- Track carbon credits
- View verification status

### Businesses
- `/business` - Business dashboard
- `/dashboard/business` - Alternative dashboard view
- Browse verified plantations
- Purchase carbon credits
- View transaction history

### Admins
- `/dashboard/admin` - Admin verification panel
- Review pending plantations
- Verify/reject submissions
- Calculate carbon credits

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Farmer Operations
- `GET /api/farmer/plantations` - List user plantations
- `POST /api/farmer/plantations` - Add new plantation
- `GET /api/farmer/credits` - Get total credits earned

### Business Operations
- `GET /api/business/plantations` - List verified plantations
- `POST /api/business/purchases` - Purchase credits
- `GET /api/business/purchases` - Purchase history

### Admin Operations
- `POST /api/admin/verify/:id/:status` - Verify/reject plantation

### General
- `GET /api/stats` - Platform statistics

## Features in Detail

### Map Visualization
- Interactive Leaflet map with plantation markers
- Zoom controls and location search
- Marker popups with plantation details
- Color-coded status indicators

### NDVI Integration
- Educational guide on satellite vegetation analysis
- Formula: NDVI = (NIR - RED) / (NIR + RED)
- Real-time calculation of carbon credits
- Health-based verification system

### Authentication
- Role-based login (farmer/business/admin)
- Session persistence with localStorage
- Protected routes and API endpoints
- Secure header-based authentication

### Dashboards
- Real-time statistics and metrics
- Interactive forms for data submission
- Status tracking and history views
- Responsive design for all devices

## Data Storage

The app uses an in-memory database (`lib/db.js`) for demonstration. For production:
- Replace with PostgreSQL or MongoDB
- Add proper authentication middleware
- Implement proper error handling
- Add data validation and sanitization

## Environment Variables

Create a `.env.local` file (optional for development):

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - feel free to use this project

## Support

For issues or questions, open an issue on the repository.
