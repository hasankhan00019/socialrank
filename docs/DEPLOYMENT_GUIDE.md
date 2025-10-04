# SociaLearn Index - Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- 4GB RAM minimum
- 10GB disk space

### 1. Clone and Configure
```bash
git clone <repository-url>
cd sociallearn-index

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment variables as needed
```

### 2. Deploy with Docker Compose
```bash
docker-compose up -d
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Database: localhost:5432

### 4. Create Admin User
```bash
# Access backend container
docker exec -it sociallearn_backend /bin/sh

# Create admin user via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com", 
    "password": "SecurePassword123",
    "role": "super_admin"
  }'
```

## Manual Setup (without Docker)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Git

### 1. Database Setup
```bash
# Create database
createdb sociallearn_index

# Import schema
psql sociallearn_index < database/schema.sql

# Import sample data (optional)
psql sociallearn_index -c "\copy institutions FROM 'sample_universities_data.csv' CSV HEADER;"
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev

# Or start production server  
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm start

# Or build for production
npm run build
```

## Production Deployment

### Recommended Hosting

**Backend + Database**:
- Railway (recommended for simplicity)
- Render
- DigitalOcean App Platform
- AWS ECS/Fargate

**Frontend**:
- Vercel (recommended)
- Netlify  
- Cloudflare Pages
- AWS S3 + CloudFront

### Environment Variables

**Backend Production (.env)**:
```bash
NODE_ENV=production
PORT=5000

# Database (use your production database URL)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=sociallearn_index
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# Security (generate secure secrets)
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRE=30d

# CORS (your frontend domain)
FRONTEND_URL=https://your-domain.com

# File uploads
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend Production (.env)**:
```bash
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
REACT_APP_SITE_NAME=SociaLearn Index
```

### Railway Deployment (Recommended)

1. **Database**:
   ```bash
   # Create PostgreSQL database on Railway
   # Copy connection string
   ```

2. **Backend**:
   ```bash
   # Connect GitHub repo to Railway
   # Set environment variables
   # Deploy automatically
   ```

3. **Frontend**:  
   ```bash
   # Deploy to Vercel
   vercel --prod

   # Or deploy to Netlify
   netlify deploy --prod --dir=build
   ```

### Performance Optimization

**Database**:
- Enable connection pooling
- Add indexes for frequent queries
- Regular VACUUM and ANALYZE

**Backend**:  
- Enable gzip compression
- Add Redis caching layer
- Use CDN for file uploads

**Frontend**:
- Enable gzip compression  
- Use CDN for static assets
- Optimize images and lazy loading

### SSL/HTTPS Setup

Most hosting providers (Railway, Vercel, Netlify) provide automatic SSL. For custom domains:

1. Purchase SSL certificate or use Let's Encrypt
2. Configure your web server (Nginx/Apache)  
3. Update CORS settings in backend
4. Test SSL configuration

### Monitoring and Logging

**Backend Monitoring**:
```bash
# Add to backend/src/server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

**Database Monitoring**:
- Enable PostgreSQL logging
- Monitor query performance
- Set up automated backups

**Frontend Analytics**:
- Google Analytics 4
- Vercel Analytics  
- Cloudflare Web Analytics

### Backup Strategy

**Database Backup**:
```bash
# Automated daily backup
pg_dump sociallearn_index > backup_$(date +%Y%m%d).sql

# Automated restore
psql sociallearn_index < backup_20240101.sql
```

**File Backup**:
- Use cloud storage (AWS S3, Google Cloud Storage)
- Automated backup scripts
- Version control for code

### Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Secure database with strong passwords
- [ ] Enable firewall and restrict database access
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Validate all inputs
- [ ] Use secure headers (Helmet.js)
- [ ] Regular security audits

### Troubleshooting

**Common Issues**:

1. **Database Connection Failed**
   - Check database credentials
   - Verify network access
   - Check firewall settings

2. **CORS Errors**  
   - Update FRONTEND_URL in backend .env
   - Check API endpoints are correct
   - Verify HTTPS/HTTP consistency

3. **File Upload Issues**
   - Check upload directory permissions
   - Verify file size limits
   - Check available disk space

4. **Performance Issues**
   - Enable database query logging
   - Check for missing indexes
   - Monitor CPU and memory usage
   - Consider adding Redis caching

**Log Analysis**:
```bash
# Backend logs
docker logs sociallearn_backend

# Database logs  
docker logs sociallearn_db

# Frontend build logs
npm run build -- --verbose
```

### Scaling Considerations

**Horizontal Scaling**:
- Load balancer for multiple backend instances
- Database read replicas
- CDN for static content
- Microservices architecture for large scale

**Vertical Scaling**:
- Increase server resources (CPU, RAM)
- Optimize database configuration
- Add caching layer (Redis/Memcached)
- Use connection pooling

This deployment guide ensures your SociaLearn Index platform runs reliably in production with proper security, monitoring, and scalability.
