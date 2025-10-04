const express = require('express');
const { body, query, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics (admin only)
router.get('/dashboard/stats', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor', 'analyst'])
], async (req, res) => {
  try {
    // Get basic counts
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM institutions WHERE is_published = true) as total_institutions,
        (SELECT COUNT(*) FROM social_accounts) as total_accounts,
        (SELECT COUNT(*) FROM social_metrics WHERE data_date >= CURRENT_DATE - INTERVAL '30 days') as recent_metrics,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM blog_posts WHERE status = 'published') as published_posts
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get platform breakdown
    const platformQuery = `
      SELECT 
        sp.display_name as platform,
        COUNT(sa.id) as account_count,
        AVG(sm.followers_count) as avg_followers
      FROM social_platforms sp
      LEFT JOIN social_accounts sa ON sp.id = sa.platform_id
      LEFT JOIN social_metrics sm ON sa.id = sm.account_id
        AND sm.data_date = (SELECT MAX(data_date) FROM social_metrics WHERE account_id = sa.id)
      WHERE sp.is_active = true
      GROUP BY sp.id, sp.display_name
      ORDER BY account_count DESC
    `;

    const platformResult = await pool.query(platformQuery);

    // Get recent activity
    const activityQuery = `
      SELECT 
        'metric_added' as type,
        i.name as institution_name,
        sp.display_name as platform,
        sm.created_at as timestamp
      FROM social_metrics sm
      JOIN social_accounts sa ON sm.account_id = sa.id
      JOIN institutions i ON sa.institution_id = i.id
      JOIN social_platforms sp ON sa.platform_id = sp.id
      WHERE sm.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY sm.created_at DESC
      LIMIT 10
    `;

    const activityResult = await pool.query(activityQuery);

    res.json({
      success: true,
      data: {
        overview: {
          total_institutions: parseInt(stats.total_institutions),
          total_accounts: parseInt(stats.total_accounts),
          recent_metrics: parseInt(stats.recent_metrics),
          total_users: parseInt(stats.total_users),
          published_posts: parseInt(stats.published_posts)
        },
        platforms: platformResult.rows.map(row => ({
          platform: row.platform,
          account_count: parseInt(row.account_count),
          avg_followers: Math.round(parseFloat(row.avg_followers) || 0)
        })),
        recent_activity: activityResult.rows
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard statistics'
    });
  }
});

// User management - Get all users (super admin only)
router.get('/users', [
  authenticate,
  authorize(['super_admin'])
], async (req, res) => {
  try {
    const query = `
      SELECT 
        id, email, name, role, is_active, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// Create new user (super admin only)
router.post('/users', [
  authenticate,
  authorize(['super_admin']),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').isLength({ min: 2 }).trim(),
  body('role').isIn(['super_admin', 'admin', 'editor', 'analyst'])
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

    const { email, password, name, role } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set permissions based on role
    const rolePermissions = {
      super_admin: {
        manage_users: true,
        manage_institutions: true,
        manage_rankings: true,
        manage_metrics: true,
        manage_blog: true,
        manage_settings: true
      },
      admin: {
        manage_institutions: true,
        manage_rankings: true,
        manage_metrics: true,
        manage_blog: true
      },
      editor: {
        manage_institutions: true,
        manage_metrics: true,
        manage_blog: true
      },
      analyst: {
        view_analytics: true,
        export_data: true
      }
    };

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, permissions)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, name, role, created_at
    `, [email, hashedPassword, name, role, JSON.stringify(rolePermissions[role] || {})]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
});

// Update user (super admin only)
router.put('/users/:id', [
  authenticate,
  authorize(['super_admin']),
  body('name').optional().isLength({ min: 2 }).trim(),
  body('role').optional().isIn(['super_admin', 'admin', 'editor', 'analyst']),
  body('is_active').optional().isBoolean()
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

    const allowedFields = ['name', 'role', 'is_active'];

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

    // Prevent user from deactivating themselves
    if (req.body.is_active === false && id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, is_active, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Get platform management data (admin)
router.get('/platforms', [
  authenticate,
  authorize(['super_admin', 'admin'])
], async (req, res) => {
  try {
    const query = `
      SELECT 
        sp.*,
        COUNT(sa.id) as account_count
      FROM social_platforms sp
      LEFT JOIN social_accounts sa ON sp.id = sa.platform_id
      GROUP BY sp.id
      ORDER BY sp.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        account_count: parseInt(row.account_count)
      }))
    });

  } catch (error) {
    console.error('Get platforms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching platforms'
    });
  }
});

// Update platform weights (admin)
router.put('/platforms/:id', [
  authenticate,
  authorize(['super_admin', 'admin']),
  body('weight').optional().isFloat({ min: 0, max: 5 }),
  body('is_active').optional().isBoolean()
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

    if (req.body.weight !== undefined) {
      paramCount++;
      updateFields.push(`weight = $${paramCount}`);
      values.push(req.body.weight);
    }

    if (req.body.is_active !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      values.push(req.body.is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE social_platforms 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, display_name, weight, is_active
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform not found'
      });
    }

    res.json({
      success: true,
      message: 'Platform updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update platform error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating platform'
    });
  }
});

module.exports = router;
