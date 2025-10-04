# SociaLearn Index API Documentation

## Authentication
All admin endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Public Endpoints

### Rankings
- `GET /api/rankings/combined` - Get combined university rankings
- `GET /api/rankings/platform/:platform` - Get platform-specific rankings
- `GET /api/rankings/top/homepage` - Get top 5 universities for homepage
- `GET /api/rankings/trending` - Get trending universities

### Institutions  
- `GET /api/institutions` - Get all institutions with filtering
- `GET /api/institutions/:id` - Get single institution details
- `GET /api/institutions/data/countries` - Get countries list
- `GET /api/institutions/data/types` - Get institution types

### Blog
- `GET /api/blog` - Get published blog posts
- `GET /api/blog/:slug` - Get single blog post

### Settings
- `GET /api/settings/public` - Get public site settings

## Admin Endpoints (Authentication Required)

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new admin
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/change-password` - Change password

### Institution Management  
- `POST /api/institutions` - Create new institution
- `PUT /api/institutions/:id` - Update institution
- `POST /api/institutions/:id/social-accounts` - Add social media account

### Metrics Management
- `GET /api/metrics/institution/:id` - Get institution metrics
- `POST /api/metrics/add` - Add single metric entry
- `POST /api/metrics/bulk-upload` - Bulk upload via CSV/Excel
- `GET /api/metrics/stats/platforms` - Get platform statistics
- `GET /api/metrics/export` - Export metrics data

### Admin Dashboard
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users (Super Admin only)
- `POST /api/admin/users` - Create new user (Super Admin only)
- `PUT /api/admin/users/:id` - Update user (Super Admin only)
- `GET /api/admin/platforms` - Get platform management data
- `PUT /api/admin/platforms/:id` - Update platform weights

### Blog Management
- `GET /api/blog/admin/all` - Get all posts for admin
- `POST /api/blog` - Create new blog post
- `PUT /api/blog/:id` - Update blog post
- `DELETE /api/blog/:id` - Delete blog post

### Settings Management
- `GET /api/settings/all` - Get all settings
- `PUT /api/settings/:key` - Update setting
- `POST /api/settings` - Create new setting

### File Upload
- `POST /api/upload/image` - Upload single image
- `POST /api/upload/images` - Upload multiple images
- `GET /api/upload/media` - Get all media files
- `DELETE /api/upload/media/:id` - Delete media file

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## Error Handling
Error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## Rate Limiting
API requests are limited to 100 requests per 15-minute window per IP address.

## Pagination
List endpoints support pagination:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_count": 200,
    "per_page": 20
  }
}
```
