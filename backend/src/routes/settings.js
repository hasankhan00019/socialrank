const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get public settings
router.get('/public', async (req, res) => {
  try {
    const query = `
      SELECT setting_key, setting_value, setting_type
      FROM site_settings
      WHERE is_public = true
      ORDER BY setting_key
    `;

    const result = await pool.query(query);

    // Format response as key-value pairs
    const settings = {};
    result.rows.forEach(row => {
      let value = row.setting_value;

      // Parse JSON settings
      if (row.setting_type === 'json' && value) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error('Error parsing JSON setting:', row.setting_key, e);
        }
      }

      // Parse boolean settings
      if (row.setting_type === 'boolean') {
        value = value === 'true';
      }

      // Parse number settings
      if (row.setting_type === 'number') {
        value = parseFloat(value) || 0;
      }

      settings[row.setting_key] = value;
    });

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching settings'
    });
  }
});

// Get all settings (admin only)
router.get('/all', [
  authenticate,
  authorize(['super_admin', 'admin'])
], async (req, res) => {
  try {
    const query = `
      SELECT 
        id, setting_key, setting_value, setting_type, 
        description, is_public, updated_at
      FROM site_settings
      ORDER BY setting_key
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching settings'
    });
  }
});

// Update setting (admin only)
router.put('/:key', [
  authenticate,
  authorize(['super_admin', 'admin']),
  body('value').exists(),
  body('type').optional().isIn(['text', 'json', 'boolean', 'number'])
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

    const { key } = req.params;
    const { value, type } = req.body;

    // Validate JSON if type is json
    if (type === 'json' && typeof value === 'string') {
      try {
        JSON.parse(value);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format'
        });
      }
    }

    const result = await pool.query(`
      UPDATE site_settings 
      SET setting_value = $1, setting_type = COALESCE($2, setting_type), updated_by = $3
      WHERE setting_key = $4
      RETURNING setting_key, setting_value, updated_at
    `, [
      typeof value === 'object' ? JSON.stringify(value) : value.toString(),
      type,
      req.user.id,
      key
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating setting'
    });
  }
});

// Create new setting (admin only)
router.post('/', [
  authenticate,
  authorize(['super_admin', 'admin']),
  body('key').notEmpty().isLength({ max: 255 }),
  body('value').exists(),
  body('type').isIn(['text', 'json', 'boolean', 'number']),
  body('description').optional(),
  body('is_public').optional().isBoolean()
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

    const { key, value, type, description, is_public = false } = req.body;

    // Check if setting already exists
    const existing = await pool.query(
      'SELECT id FROM site_settings WHERE setting_key = $1',
      [key]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Setting with this key already exists'
      });
    }

    // Validate JSON if type is json
    if (type === 'json' && typeof value === 'string') {
      try {
        JSON.parse(value);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format'
        });
      }
    }

    const result = await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, setting_type, description, is_public, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, setting_key, setting_value, created_at
    `, [
      key,
      typeof value === 'object' ? JSON.stringify(value) : value.toString(),
      type,
      description,
      is_public,
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating setting'
    });
  }
});

module.exports = router;
