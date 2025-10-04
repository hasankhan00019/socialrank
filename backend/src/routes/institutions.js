const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Get all institutions (public endpoint with filters)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('country').optional(),
  query('type').optional(),
  query('search').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { country, type, search } = req.query;

    let whereClause = 'WHERE i.is_published = true';
    let queryParams = [];
    let paramCount = 0;

    // Build dynamic WHERE clause
    if (country) {
      paramCount++;
      whereClause += ` AND c.name ILIKE $${paramCount}`;
      queryParams.push(`%${country}%`);
    }

    if (type) {
      paramCount++;
      whereClause += ` AND t.name ILIKE $${paramCount}`;
      queryParams.push(`%${type}%`);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (i.name ILIKE $${paramCount} OR i.short_name ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Add pagination params
    queryParams.push(limit, offset);

    const query = `
      SELECT 
        i.id, i.name, i.short_name, i.website, i.logo_url,
        i.founded_year, i.student_count,
        c.name as country, c.code as country_code,
        t.name as institution_type,
        COUNT(*) OVER() as total_count
      FROM institutions i
      LEFT JOIN countries c ON i.country_id = c.id
      LEFT JOIN institution_types t ON i.type_id = t.id
      ${whereClause}
      ORDER BY i.name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(query, queryParams);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Remove total_count from individual records
    const institutions = result.rows.map(row => {
      const { total_count, ...institution } = row;
      return institution;
    });

    res.json({
      success: true,
      data: {
        institutions,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching institutions'
    });
  }
});

// Get single institution by ID with social accounts
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get institution details
    const institutionResult = await pool.query(`
      SELECT 
        i.id, i.name, i.short_name, i.website, i.logo_url, i.description,
        i.founded_year, i.student_count, i.staff_count, i.is_verified,
        c.name as country, c.code as country_code,
        t.name as institution_type,
        i.created_at, i.updated_at
      FROM institutions i
      LEFT JOIN countries c ON i.country_id = c.id
      LEFT JOIN institution_types t ON i.type_id = t.id
      WHERE i.id = $1 AND i.is_published = true
    `, [id]);

    if (institutionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    const institution = institutionResult.rows[0];

    // Get social media accounts
    const socialResult = await pool.query(`
      SELECT 
        sa.id, sa.handle, sa.url, sa.is_verified,
        sp.name as platform_name, sp.display_name, sp.color_hex, sp.icon_name
      FROM social_accounts sa
      JOIN social_platforms sp ON sa.platform_id = sp.id
      WHERE sa.institution_id = $1 AND sp.is_active = true
      ORDER BY sp.name
    `, [id]);

    // Get latest metrics for each platform
    const metricsResult = await pool.query(`
      SELECT DISTINCT ON (sa.platform_id)
        sa.platform_id,
        sm.followers_count, sm.engagement_rate, sm.total_engagement,
        sm.monthly_growth, sm.data_date,
        sp.display_name as platform_name
      FROM social_accounts sa
      JOIN social_metrics sm ON sa.id = sm.account_id
      JOIN social_platforms sp ON sa.platform_id = sp.id
      WHERE sa.institution_id = $1
      ORDER BY sa.platform_id, sm.data_date DESC
    `, [id]);

    // Format response
    const response = {
      ...institution,
      social_accounts: socialResult.rows,
      latest_metrics: metricsResult.rows
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching institution'
    });
  }
});

// Create new institution (admin only)
router.post('/', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  body('name').notEmpty().isLength({ max: 500 }),
  body('country_id').isInt(),
  body('type_id').isInt(),
  body('website').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name, short_name, country_id, type_id, website, 
      description, founded_year, student_count, staff_count
    } = req.body;

    const result = await pool.query(`
      INSERT INTO institutions 
      (name, short_name, country_id, type_id, website, description, 
       founded_year, student_count, staff_count, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, created_at
    `, [name, short_name, country_id, type_id, website, description,
        founded_year, student_count, staff_count, req.user.id]);

    res.status(201).json({
      success: true,
      message: 'Institution created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating institution'
    });
  }
});

// Update institution (admin only)
router.put('/:id', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  body('name').optional().isLength({ max: 500 }),
  body('website').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query
    const allowedFields = [
      'name', 'short_name', 'country_id', 'type_id', 'website',
      'logo_url', 'description', 'founded_year', 'student_count', 'staff_count'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE institutions 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, name, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    res.json({
      success: true,
      message: 'Institution updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating institution'
    });
  }
});

// Add social media account to institution
router.post('/:id/social-accounts', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  body('platform_id').isInt(),
  body('handle').notEmpty(),
  body('url').isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: institutionId } = req.params;
    const { platform_id, handle, url, is_verified = false } = req.body;

    const result = await pool.query(`
      INSERT INTO social_accounts (institution_id, platform_id, handle, url, is_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, handle, url, created_at
    `, [institutionId, platform_id, handle, url, is_verified]);

    res.status(201).json({
      success: true,
      message: 'Social media account added successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Add social account error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Social media account already exists for this platform'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error adding social account'
    });
  }
});

// Get countries for dropdown
router.get('/data/countries', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, code FROM countries ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching countries'
    });
  }
});

// Get institution types for dropdown
router.get('/data/types', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM institution_types ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get institution types error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching institution types'
    });
  }
});

module.exports = router;
