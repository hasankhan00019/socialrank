# SociaLearn Index

> The Global Benchmark for Digital Influence in Higher Education

SociaLearn Index is a comprehensive platform that ranks universities and higher education institutions based on their social media presence, engagement, and influence across multiple platforms including Facebook, Instagram, X/Twitter, YouTube, TikTok, and LinkedIn.

## 🌟 Features

### Public Features
- **🏆 University Rankings**: Combined and platform-specific rankings with transparent methodology
- **📊 Interactive Dashboards**: Visual analytics with charts and data visualizations  
- **🔍 Advanced Search & Filters**: Find institutions by country, type, and performance metrics
- **📈 Trending Analysis**: Monthly growth leaders and engagement insights
- **⚖️ Compare Institutions**: Side-by-side comparison tool for up to 3 universities
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🌐 SEO Optimized**: Fast loading, meta tags, and search engine friendly URLs

### Admin Dashboard Features
- **👥 User Management**: Role-based access control (Super Admin, Admin, Editor, Analyst)
- **🏫 Institution Management**: CRUD operations for university data and social accounts
- **📊 Metrics Management**: Manual entry and bulk upload (CSV/Excel) of social media data
- **🎯 Ranking Control**: Algorithm weight adjustment and ranking publication controls
- **📝 CMS System**: Blog post management with SEO optimization
- **⚙️ Settings Management**: Dynamic site configuration and content management
- **📤 Data Export**: CSV and JSON export capabilities for analytics
- **📈 Real-time Analytics**: Dashboard with key performance indicators and trends

### Technical Features
- **🔐 JWT Authentication**: Secure token-based authentication system
- **🛡️ Role-based Permissions**: Granular access control and security
- **📡 RESTful API**: Well-documented API endpoints for data access
- **⚡ Real-time Updates**: Live data synchronization and notifications
- **🌍 International Support**: Multi-country and multi-language ready
- **📱 Progressive Web App**: Offline capability and app-like experience

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL with optimized schema and indexes
- **Authentication**: JWT with role-based access control
- **File Upload**: Multer integration for CSV/Excel bulk imports
- **Security**: Helmet, CORS, rate limiting, input validation
- **Error Handling**: Comprehensive error handling and logging

### Frontend (React + TypeScript)
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth user interactions
- **State Management**: React Query for server state and Context API for auth
- **Charts**: Chart.js and React-ChartJS-2 for data visualization
- **Routing**: React Router with protected routes
- **Components**: Reusable, accessible, and responsive components

### Database Schema
- **12 Optimized Tables**: Institutions, rankings, metrics, users, blog posts, etc.
- **Relationships**: Proper foreign keys and constraints
- **Indexes**: Performance-optimized queries
- **Triggers**: Automatic timestamp updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sociallearn-index
   ```

2. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb sociallearn_index

   # Run schema
   psql sociallearn_index < database/schema.sql
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install

   # Copy and configure environment
   cp .env.example .env
   # Edit .env with your database credentials

   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install

   # Copy and configure environment  
   cp .env.example .env
   # Edit .env with your API URL

   npm start
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - API Health Check: http://localhost:5000/api/health

### Docker Deployment

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Individual Services**
   ```bash
   # Database
   docker run -d --name postgres -e POSTGRES_DB=sociallearn_index -e POSTGRES_PASSWORD=password123 -p 5432:5432 postgres:15-alpine

   # Backend
   docker build -t sociallearn-backend ./backend
   docker run -d --name backend -p 5000:5000 --link postgres:postgres sociallearn-backend

   # Frontend
   docker build -t sociallearn-frontend ./frontend  
   docker run -d --name frontend -p 3000:3000 sociallearn-frontend
   ```

## 📊 Sample Data

The project includes realistic sample data based on actual research:
- **15 Top Universities**: Harvard, Stanford, Cambridge, Oxford, MIT, etc.
- **Social Media Platforms**: Facebook, Instagram, Twitter, TikTok, YouTube, LinkedIn
- **Realistic Metrics**: Follower counts and engagement rates based on 2025 research data
- **Growth Trends**: Monthly growth patterns and trending analysis

## 🛠️ API Endpoints

### Public Endpoints
- `GET /api/rankings/combined` - Get combined university rankings
- `GET /api/rankings/platform/:platform` - Get platform-specific rankings  
- `GET /api/institutions` - Get all institutions with filters
- `GET /api/institutions/:id` - Get institution details
- `GET /api/blog` - Get published blog posts

### Admin Endpoints (Authentication Required)
- `POST /api/auth/login` - Admin login
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `POST /api/institutions` - Create new institution
- `POST /api/metrics/bulk-upload` - Bulk upload metrics
- `GET /api/admin/users` - User management (Super Admin only)

## 🎯 Ranking Algorithm

The ranking algorithm considers multiple factors:

```javascript
// Platform Score Calculation
follower_score = (institution_followers / max_followers) × 50
engagement_score = (avg_engagement / max_engagement) × 50
platform_score = follower_score + engagement_score

// Combined Index  
total_score = Σ(platform_score × platform_weight)
```

**Weights are configurable**:
- Instagram: 1.2 (Higher engagement platform)
- TikTok: 1.3 (Trending platform with younger audience)
- Facebook: 1.0 (Baseline)
- YouTube: 1.1 (Video content focus)
- LinkedIn: 0.9 (Professional network)
- Twitter/X: 0.8 (News and updates)

## 👥 User Roles & Permissions

### Super Admin
- Full system access
- User management
- System settings
- All data operations

### Admin  
- Institution management
- Ranking control
- Blog management
- Metrics management

### Editor
- Institution data entry
- Metrics data entry  
- Blog post creation
- Content management

### Analyst
- View analytics
- Export data
- Generate reports
- Read-only dashboard access

## 🌍 Production Deployment

### Environment Variables

**Backend (.env)**:
```bash
NODE_ENV=production
DB_HOST=your-db-host
DB_NAME=sociallearn_index
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=https://your-domain.com
```

**Frontend (.env)**:
```bash
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

### Hosting Recommendations

**Backend**: 
- Railway, Render, DigitalOcean App Platform
- Minimum: 1GB RAM, 1 CPU core

**Database**:
- Railway PostgreSQL, Supabase, DigitalOcean Managed Database
- Minimum: 1GB RAM, 10GB storage

**Frontend**:
- Vercel, Netlify, Cloudflare Pages
- Static hosting with CDN

## 📈 Performance Optimizations

- **Database Indexes**: Optimized queries for rankings and metrics
- **API Caching**: Redis integration ready for production
- **Image Optimization**: Automated image compression and CDN ready
- **Code Splitting**: React lazy loading for optimal bundle size
- **Compression**: Gzip compression for API responses
- **CDN Ready**: Static assets optimized for CDN delivery

## 🔒 Security Features

- **Input Validation**: Express-validator for all endpoints
- **Rate Limiting**: Protection against abuse
- **Helmet**: Security headers and CSRF protection
- **JWT Security**: Secure token generation and validation
- **File Upload Security**: Type validation and size limits
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content sanitization

## 📚 Documentation

- **API Documentation**: Available at `/api/docs` (Swagger/OpenAPI)
- **User Guide**: Admin dashboard includes contextual help
- **Technical Documentation**: Inline code comments and README files
- **Database Schema**: Full ERD and relationship documentation

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Integration tests
npm run test:integration

# E2E tests with Cypress
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Email**: support@sociallearn-index.com
- **Documentation**: https://docs.sociallearn-index.com
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core ranking system
- ✅ Admin dashboard  
- ✅ Public website
- ✅ Basic analytics

### Phase 2 (Q2 2025)
- 🔄 Social Media API Integration
- 🔄 Advanced Analytics & AI Insights
- 🔄 Mobile App (React Native)
- 🔄 Email Notifications & Alerts

### Phase 3 (Q3 2025)
- 🔄 Personalized Dashboards
- 🔄 University Verification System
- 🔄 Advanced Comparison Tools
- 🔄 White-label Solutions

---

**Built with ❤️ for the higher education community**

*Made by researchers, for researchers. Helping universities understand and improve their digital engagement in the social media age.*
