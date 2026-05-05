# CarbonCredit

A comprehensive platform for trading satellite-verified carbon credits, connecting farmers, businesses, and administrators in a transparent carbon market ecosystem.

## 🌟 Overview

CarbonCredit is a full-stack web application built with Next.js that enables:
- **Farmers** to register and monetize reforestation projects
- **Businesses** to purchase verified carbon credits for net-zero goals
- **Administrators** to verify plantations using NDVI satellite data

The platform uses Normalized Difference Vegetation Index (NDVI) from satellite imagery to ensure transparent, verifiable carbon sequestration measurements.

## ✨ Key Features

### 🔐 Multi-Role Authentication
- Role-based access control (Farmer, Business, Admin)
- Secure JWT-based session management
- Protected API endpoints and dashboard routes

### 🗺️ Interactive Mapping
- Real-time plantation visualization with Leaflet
- Location-based search and filtering
- Color-coded status indicators (pending, verified, rejected)
- Detailed plantation information popups

### 📊 NDVI Verification System
- Satellite-based vegetation health monitoring
- Automated carbon credit calculations
- Educational NDVI guide for users
- Real-time verification status updates

### 💼 Business Dashboard
- Browse available carbon credits
- Secure purchase transactions
- Transaction history and receipts
- Portfolio management

### 🌱 Farmer Dashboard
- Register new plantation plots
- Upload documentation and coordinates
- Track verification progress
- Monitor earned carbon credits

### 🛡️ Admin Panel
- Review pending plantation submissions
- NDVI-based verification workflow
- Credit issuance and management
- Platform statistics and analytics

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: In-memory storage (production-ready for PostgreSQL/MongoDB)
- **Maps**: Leaflet with React Leaflet
- **Authentication**: Custom JWT implementation
- **Styling**: Tailwind CSS with custom design system
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0 or higher
- pnpm package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CarbonCredit
```

2. Navigate to the Next.js app directory:
```bash
cd nextjs-app
```

3. Install dependencies:
```bash
pnpm install
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
pnpm build
pnpm start
```

## 📁 Project Structure

```
CarbonCredit/
├── README.md
├── Sync.txt
├── nextjs-app/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── admin/
│   │   │   └── page.js
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── plantations/
│   │   │   │   │   └── route.js
│   │   │   │   └── verify/
│   │   │   │       └── route.js
│   │   │   ├── auth/
│   │   │   │   ├── confirm/
│   │   │   │   │   └── route.js
│   │   │   │   ├── login/
│   │   │   │   │   └── route.js
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.js
│   │   │   │   ├── register/
│   │   │   │   │   └── route.js
│   │   │   │   └── resend/
│   │   │   │       └── route.js
│   │   │   ├── business/
│   │   │   │   ├── plantations/
│   │   │   │   │   └── route.js
│   │   │   │   └── purchases/
│   │   │   │       └── route.js
│   │   │   ├── farmer/
│   │   │   │   ├── credits/
│   │   │   │   │   └── route.js
│   │   │   │   ├── plantations/
│   │   │   │   │   └── route.js
│   │   │   │   └── upload/
│   │   │   │       └── route.js
│   │   │   ├── geo/
│   │   │   │   ├── nearby/
│   │   │   │   │   └── route.js
│   │   │   │   └── search/
│   │   │   │       └── route.js
│   │   │   └── stats/
│   │   │       └── route.js
│   │   ├── auth/
│   │   │   ├── confirm/
│   │   │   │   ├── ConfirmClient.js
│   │   │   │   └── page.js
│   │   │   └── login/
│   │   │       └── page.js
│   │   ├── business/
│   │   │   └── page.js
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   └── page.js
│   │   │   ├── business/
│   │   │   │   └── page.js
│   │   │   └── farmer/
│   │   │       └── page.js
│   │   ├── farmer/
│   │   │   └── page.js
│   │   ├── login/
│   │   │   └── page.js
│   │   ├── map/
│   │   │   └── page.js
│   │   ├── ndvi-guide/
│   │   │   └── page.js
│   │   └── register/
│   │       └── page.js
│   ├── components/
│   │   └── MapComponent.js
│   ├── lib/
│   │   ├── auth.js
│   │   └── db.js
│   ├── public/
│   ├── jsconfig.json
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── postcss.config.js
│   └── tailwind.config.js
```

## 🔗 API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user account |
| POST | `/api/auth/login` | User authentication |
| POST | `/api/auth/logout` | End user session |
| POST | `/api/auth/confirm` | Confirm email registration |
| POST | `/api/auth/resend` | Resend confirmation email |

### Farmer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farmer/plantations` | List user's plantations |
| POST | `/api/farmer/plantations` | Register new plantation |
| GET | `/api/farmer/credits` | Get total earned credits |
| POST | `/api/farmer/upload` | Upload plantation documents |

### Business Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/business/plantations` | Browse verified plantations |
| POST | `/api/business/purchases` | Purchase carbon credits |
| GET | `/api/business/purchases` | View purchase history |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/plantations` | List all plantations for review |
| POST | `/api/admin/verify` | Verify or reject plantation |

### General Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Platform statistics |
| GET | `/api/geo/nearby` | Find nearby plantations |
| GET | `/api/geo/search` | Search plantations by location |

## 🎯 User Roles & Workflows

### Farmer Workflow
1. Register account with farmer role
2. Add plantation details (coordinates, area, tree types)
3. Upload supporting documentation
4. Wait for admin verification via NDVI analysis
5. Receive carbon credits once verified
6. Monitor credit balance and transaction history

### Business Workflow
1. Register account with business role
2. Browse verified plantations on marketplace
3. Purchase carbon credits from available listings
4. View transaction receipts and impact reports
5. Track portfolio of purchased credits

### Admin Workflow
1. Register account with admin role
2. Review pending plantation submissions
3. Analyze NDVI data for verification
4. Approve/reject plantations with feedback
5. Monitor platform statistics and user activity

## 🌍 NDVI Verification Process

The platform uses satellite-derived NDVI measurements to verify carbon sequestration:

**NDVI Formula**: `(NIR - RED) / (NIR + RED)`

- **NIR**: Near-Infrared light reflection
- **RED**: Visible red light reflection
- **Range**: -1 to +1 (healthy vegetation = higher values)

Credits are calculated based on:
- Plantation area (hectares)
- NDVI health score
- Tree species carbon sequestration rates
- Time-based growth factors

## 🔧 Configuration

### Environment Variables
Create `.env.local` in the `nextjs-app` directory:

```env
# Database Configuration (for production)
DATABASE_URL=postgresql://user:password@localhost:5432/carboncredit

# Authentication
JWT_SECRET=your-secret-key-here

# External APIs (if needed)
SATELLITE_API_KEY=your-api-key
```

### Database Setup
The app currently uses in-memory storage. For production:

1. Set up PostgreSQL or MongoDB
2. Update `lib/db.js` with database connections
3. Run database migrations
4. Configure connection pooling

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork
6. Submit a pull request

### Development Guidelines
- Follow Next.js best practices
- Use TypeScript for new components
- Maintain consistent code style
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Email**: support@carboncredit.com

## 🙏 Acknowledgments

- Satellite data providers for NDVI measurements
- Open source community for mapping libraries
- Environmental organizations for carbon credit standards

---

Built with ❤️ for a sustainable future
