const express = require('express');
const { body, query, validationResult } = require('express-validator');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const multer = require('multer');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

// Get metrics for institution (public)
router.get('/institution/:id', [
  query('platform').optional(),
  query('days').optional().isInt({ min: 30, max: 365 })
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
    const { platform, days = 180 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let platformWhere = '';
    let queryParams = [id, startDate.toISOString().split('T')[0]];

    if (platform) {
      platformWhere = 'AND sp.name = $3';
      queryParams.push(platform);
    }

    const query = `
      SELECT 
        sm.followers_count, sm.engagement_rate, sm.total_engagement,
        sm.monthly_growth, sm.data_date,
        sp.name as platform_name, sp.display_name, sp.color_hex,
        sa.handle, sa.url
      FROM social_metrics sm
      JOIN social_accounts sa ON sm.account_id = sa.id
      JOIN social_platforms sp ON sa.platform_id = sp.id
      WHERE sa.institution_id = $1 
        AND sm.data_date >= $2
        ${platformWhere}
      ORDER BY sp.name, sm.data_date DESC
    `;

    const result = await pool.query(query, queryParams);

    // Group by platform
    const metricsByPlatform = {};
    result.rows.forEach(row => {
      if (!metricsByPlatform[row.platform_name]) {
        metricsByPlatform[row.platform_name] = {
          platform_info: {
            name: row.platform_name,
            display_name: row.display_name,
            color: row.color_hex,
            handle: row.handle,
            url: row.url
          },
          metrics: []
        };
      }

      metricsByPlatform[row.platform_name].metrics.push({
        followers_count: row.followers_count,
        engagement_rate: parseFloat(row.engagement_rate),
        total_engagement: row.total_engagement,
        monthly_growth: parseFloat(row.monthly_growth),
        data_date: row.data_date
      });
    });

    res.json({
      success: true,
      data: metricsByPlatform
    });

  } catch (error) {
    console.error('Get institution metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching metrics'
    });
  }
});

// Add single metric entry (admin only)
router.post('/add', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  body('account_id').isUUID(),
  body('followers_count').isInt({ min: 0 }),
  body('engagement_rate').isFloat({ min: 0, max: 100 }),
  body('data_date').isISO8601()
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
      account_id, followers_count, following_count = 0, posts_count = 0,
      engagement_rate, avg_likes = 0, avg_comments = 0, avg_shares = 0,
      monthly_growth = 0, total_engagement = 0, data_date
    } = req.body;

    // Check if metric already exists for this date
    const existingResult = await pool.query(
      'SELECT id FROM social_metrics WHERE account_id = $1 AND data_date = $2',
      [account_id, data_date]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Metric already exists for this date'
      });
    }

    const result = await pool.query(`
      INSERT INTO social_metrics 
      (account_id, followers_count, following_count, posts_count, engagement_rate,
       avg_likes, avg_comments, avg_shares, monthly_growth, total_engagement, data_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, data_date, created_at
    `, [account_id, followers_count, following_count, posts_count, engagement_rate,
        avg_likes, avg_comments, avg_shares, monthly_growth, total_engagement, data_date, req.user.id]);

    res.status(201).json({
      success: true,
      message: 'Metric added successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Add metric error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding metric'
    });
  }
});

// Bulk upload metrics via CSV/Excel (admin only)
router.post('/bulk-upload', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  upload.single('file')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let data = [];

    // Parse CSV or Excel file
    if (req.file.mimetype === 'text/csv') {
      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const rows = csvContent.split('\n');
      const headers = rows[0].split(',').map(h => h.trim());

      for (let i = 1; i < rows.length; i++) {
        if (rows[i].trim()) {
          const values = rows[i].split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim();
          });
          data.push(row);
        }
      }
    } else {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(sheet);
    }

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data found in file'
      });
    }

    // Validate required columns
    const requiredColumns = ['account_id', 'followers_count', 'engagement_rate', 'data_date'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Process data in batches
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of data) {
        try {
          // Skip if metric already exists
          const existingResult = await client.query(
            'SELECT id FROM social_metrics WHERE account_id = $1 AND data_date = $2',
            [row.account_id, row.data_date]
          );

          if (existingResult.rows.length === 0) {
            await client.query(`
              INSERT INTO social_metrics 
              (account_id, followers_count, following_count, posts_count, engagement_rate,
               avg_likes, avg_comments, avg_shares, monthly_growth, total_engagement, data_date, created_by)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
              row.account_id,
              parseInt(row.followers_count) || 0,
              parseInt(row.following_count) || 0,
              parseInt(row.posts_count) || 0,
              parseFloat(row.engagement_rate) || 0,
              parseFloat(row.avg_likes) || 0,
              parseFloat(row.avg_comments) || 0,
              parseFloat(row.avg_shares) || 0,
              parseFloat(row.monthly_growth) || 0,
              parseInt(row.total_engagement) || 0,
              row.data_date,
              req.user.id
            ]);
            successCount++;
          }
        } catch (rowError) {
          errorCount++;
          errors.push({
            row: row,
            error: rowError.message
          });
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Bulk upload completed',
        data: {
          total_rows: data.length,
          success_count: successCount,
          error_count: errorCount,
          errors: errors.slice(0, 10) // Return first 10 errors
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk upload'
    });
  }
});

// Get platform statistics (admin only)
router.get('/stats/platforms', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor', 'analyst'])
], async (req, res) => {
  try {
    const query = `
      SELECT 
        sp.display_name as platform,
        COUNT(DISTINCT sa.id) as account_count,
        AVG(sm.followers_count) as avg_followers,
        AVG(sm.engagement_rate) as avg_engagement_rate,
        SUM(sm.total_engagement) as total_engagement
      FROM social_platforms sp
      LEFT JOIN social_accounts sa ON sp.id = sa.platform_id
      LEFT JOIN social_metrics sm ON sa.id = sm.account_id
        AND sm.data_date = (
          SELECT MAX(data_date) FROM social_metrics WHERE account_id = sa.id
        )
      WHERE sp.is_active = true
      GROUP BY sp.id, sp.display_name
      ORDER BY account_count DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        platform: row.platform,
        account_count: parseInt(row.account_count),
        avg_followers: Math.round(parseFloat(row.avg_followers) || 0),
        avg_engagement_rate: Math.round((parseFloat(row.avg_engagement_rate) || 0) * 100) / 100,
        total_engagement: parseInt(row.total_engagement) || 0
      }))
    });

  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching platform statistics'
    });
  }
});

// Export metrics data (admin only)
router.get('/export', [
  authenticate,
  authorize(['super_admin', 'admin', 'analyst']),
  query('format').isIn(['csv', 'json']),
  query('institution_id').optional().isUUID(),
  query('platform').optional(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
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

    const { format, institution_id, platform, start_date, end_date } = req.query;

    let whereClause = '1=1';
    let queryParams = [];
    let paramCount = 0;

    if (institution_id) {
      paramCount++;
      whereClause += ` AND sa.institution_id = $${paramCount}`;
      queryParams.push(institution_id);
    }

    if (platform) {
      paramCount++;
      whereClause += ` AND sp.name = $${paramCount}`;
      queryParams.push(platform);
    }

    if (start_date) {
      paramCount++;
      whereClause += ` AND sm.data_date >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND sm.data_date <= $${paramCount}`;
      queryParams.push(end_date);
    }

    const query = `
      SELECT 
        i.name as institution_name,
        sp.display_name as platform,
        sa.handle,
        sm.followers_count, sm.engagement_rate, sm.total_engagement,
        sm.monthly_growth, sm.data_date
      FROM social_metrics sm
      JOIN social_accounts sa ON sm.account_id = sa.id
      JOIN institutions i ON sa.institution_id = i.id
      JOIN social_platforms sp ON sa.platform_id = sp.id
      WHERE ${whereClause}
      ORDER BY i.name, sp.display_name, sm.data_date DESC
    `;

    const result = await pool.query(query, queryParams);

    if (format === 'csv') {
      const csvHeaders = Object.keys(result.rows[0] || {}).join(',');
      const csvRows = result.rows.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
      );

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=metrics_export_${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: result.rows,
        export_info: {
          total_records: result.rows.length,
          generated_at: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Export metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error exporting metrics'
    });
  }
});

module.exports = router;
