const express = require('express');
const { query, body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { recalculateRankings } = require('../utils/rankingService');

const router = express.Router();

// Get combined rankings (public)
router.get('/combined', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('country').optional(),
  query('type').optional()
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
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { country, type } = req.query;

    let whereClause = 'WHERE r.ranking_type = \'combined\' AND r.is_published = true';
    let joinClause = '';
    let queryParams = [];
    let paramCount = 0;

    // Add filters
    if (country || type) {
      joinClause = `
        JOIN institutions inst ON r.institution_id = inst.id
        LEFT JOIN countries c ON inst.country_id = c.id
        LEFT JOIN institution_types t ON inst.type_id = t.id
      `;

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
    }

    // Get latest rankings
    const latestDateResult = await pool.query(`
      SELECT MAX(calculation_date) as latest_date 
      FROM rankings 
      WHERE ranking_type = 'combined' AND is_published = true
    `);

    const latestDate = latestDateResult.rows[0].latest_date;
    if (!latestDate) {
      return res.json({
        success: true,
        data: {
          rankings: [],
          pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: limit }
        }
      });
    }

    whereClause += ` AND r.calculation_date = '${latestDate}'`;
    queryParams.push(limit, offset);

    const query = `
      SELECT 
        r.rank_position, r.score, r.follower_score, r.engagement_score, r.growth_score,
        i.id, i.name, i.short_name, i.logo_url, i.website,
        c.name as country, c.code as country_code,
        t.name as institution_type,
        r.calculation_date,
        COUNT(*) OVER() as total_count
      FROM rankings r
      JOIN institutions i ON r.institution_id = i.id
      LEFT JOIN countries c ON i.country_id = c.id
      LEFT JOIN institution_types t ON i.type_id = t.id
      ${whereClause}
      ORDER BY r.rank_position
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(query, queryParams);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const rankings = result.rows.map(row => {
      const { total_count, ...ranking } = row;
      return ranking;
    });

    res.json({
      success: true,
      data: {
        rankings,
        latest_update: latestDate,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get combined rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching rankings'
    });
  }
});

// Get platform-specific rankings (public)
router.get('/platform/:platformName', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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

    const { platformName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get platform ID
    const platformResult = await pool.query(
      'SELECT id, display_name FROM social_platforms WHERE name = $1 AND is_active = true',
      [platformName]
    );

    if (platformResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform not found'
      });
    }

    const platform = platformResult.rows[0];

    // Get latest rankings for this platform
    const latestDateResult = await pool.query(`
      SELECT MAX(calculation_date) as latest_date 
      FROM rankings 
      WHERE ranking_type = 'platform_specific' AND platform_id = $1 AND is_published = true
    `, [platform.id]);

    const latestDate = latestDateResult.rows[0].latest_date;
    if (!latestDate) {
      return res.json({
        success: true,
        data: {
          platform: platform.display_name,
          rankings: [],
          pagination: { current_page: 1, total_pages: 0, total_count: 0, per_page: limit }
        }
      });
    }

    const query = `
      SELECT 
        r.rank_position, r.score,
        i.id, i.name, i.short_name, i.logo_url,
        c.name as country,
        sm.followers_count, sm.engagement_rate, sm.total_engagement,
        sa.handle, sa.url,
        COUNT(*) OVER() as total_count
      FROM rankings r
      JOIN institutions i ON r.institution_id = i.id
      LEFT JOIN countries c ON i.country_id = c.id
      LEFT JOIN social_accounts sa ON i.id = sa.institution_id AND sa.platform_id = $1
      LEFT JOIN social_metrics sm ON sa.id = sm.account_id 
        AND sm.data_date = (
          SELECT MAX(data_date) FROM social_metrics 
          WHERE account_id = sa.id AND data_date <= r.calculation_date
        )
      WHERE r.ranking_type = 'platform_specific' 
        AND r.platform_id = $1 
        AND r.calculation_date = $2 
        AND r.is_published = true
      ORDER BY r.rank_position
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [platform.id, latestDate, limit, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const rankings = result.rows.map(row => {
      const { total_count, ...ranking } = row;
      return ranking;
    });

    res.json({
      success: true,
      data: {
        platform: platform.display_name,
        rankings,
        latest_update: latestDate,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get platform rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching platform rankings'
    });
  }
});

// Get top 5 institutions for homepage (public)
router.get('/top/homepage', async (req, res) => {
  try {
    // Get latest combined rankings
    const latestDateResult = await pool.query(`
      SELECT MAX(calculation_date) as latest_date 
      FROM rankings 
      WHERE ranking_type = 'combined' AND is_published = true
    `);

    const latestDate = latestDateResult.rows[0].latest_date;
    if (!latestDate) {
      return res.json({
        success: true,
        data: []
      });
    }

    const query = `
      SELECT 
        r.rank_position, r.score,
        i.id, i.name, i.logo_url, i.website,
        c.name as country,
        (SELECT COUNT(*) FROM social_accounts WHERE institution_id = i.id) as platform_count
      FROM rankings r
      JOIN institutions i ON r.institution_id = i.id
      LEFT JOIN countries c ON i.country_id = c.id
      WHERE r.ranking_type = 'combined' 
        AND r.calculation_date = $1 
        AND r.is_published = true
      ORDER BY r.rank_position
      LIMIT 5
    `;

    const result = await pool.query(query, [latestDate]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get top institutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching top institutions'
    });
  }
});

// Get trending institutions (monthly growth)
router.get('/trending', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const query = `
      SELECT 
        i.id, i.name, i.logo_url,
        c.name as country,
        AVG(sm.monthly_growth) as avg_growth,
        SUM(sm.followers_count) as total_followers
      FROM institutions i
      JOIN social_accounts sa ON i.id = sa.institution_id
      JOIN social_metrics sm ON sa.id = sm.account_id
      LEFT JOIN countries c ON i.country_id = c.id
      WHERE sm.data_date >= CURRENT_DATE - INTERVAL '30 days'
        AND sm.monthly_growth > 0
      GROUP BY i.id, i.name, i.logo_url, c.name
      HAVING COUNT(DISTINCT sa.platform_id) >= 2
      ORDER BY avg_growth DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get trending institutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trending institutions'
    });
  }
});

// Recalculate rankings (admin only)
router.post('/recalculate', [
  authenticate,
  authorize(['super_admin', 'admin']),
  body('publish').optional().isBoolean(),
  body('calculationDate').optional().isISO8601()
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

    const { publish = false, calculationDate = null } = req.body || {};
    const result = await recalculateRankings({ publish, calculationDate });

    res.json({
      success: true,
      message: 'Ranking recalculation completed',
      data: result
    });

  } catch (error) {
    console.error('Recalculate rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recalculating rankings'
    });
  }
});

// Preview recalculated combined rankings (admin only, no DB writes)
router.get('/preview', [
  authenticate,
  authorize(['super_admin', 'admin']),
  query('limit').optional().isInt({ min: 1, max: 200 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const queryText = `
      WITH latest_metrics AS (
        SELECT DISTINCT ON (sm.account_id)
          sm.account_id,
          sa.institution_id,
          sa.platform_id,
          sm.followers_count,
          sm.engagement_rate
        FROM social_metrics sm
        JOIN social_accounts sa ON sa.id = sm.account_id
        ORDER BY sm.account_id, sm.data_date DESC
      ),
      platform_max AS (
        SELECT
          platform_id,
          MAX(followers_count) AS max_followers,
          MAX(engagement_rate) AS max_engagement
        FROM latest_metrics
        GROUP BY platform_id
      ),
      computed AS (
        SELECT
          lm.institution_id,
          lm.platform_id,
          CASE WHEN pm.max_followers > 0 THEN (lm.followers_count::numeric / pm.max_followers) * 50 ELSE 0 END AS follower_score,
          CASE WHEN pm.max_engagement > 0 THEN (lm.engagement_rate::numeric / pm.max_engagement) * 50 ELSE 0 END AS engagement_score
        FROM latest_metrics lm
        JOIN platform_max pm ON pm.platform_id = lm.platform_id
      ),
      combined AS (
        SELECT
          c.institution_id,
          SUM((c.follower_score + c.engagement_score) * COALESCE(sp.weight, 1.0)) AS total_score
        FROM computed c
        JOIN social_platforms sp ON sp.id = c.platform_id AND sp.is_active = true
        GROUP BY c.institution_id
      )
      SELECT 
        ROW_NUMBER() OVER (ORDER BY total_score DESC, i.id) AS rank_position,
        ROUND(combined.total_score::numeric, 2) AS score,
        i.id, i.name, i.short_name, i.logo_url, i.website,
        ctry.name AS country, ctry.code AS country_code,
        itype.name AS institution_type
      FROM combined
      JOIN institutions i ON i.id = combined.institution_id
      LEFT JOIN countries ctry ON i.country_id = ctry.id
      LEFT JOIN institution_types itype ON i.type_id = itype.id
      ORDER BY rank_position
      LIMIT $1;
    `;

    const result = await pool.query(queryText, [limit]);

    res.json({
      success: true,
      data: {
        rankings: result.rows,
        calculation_preview_date: new Date().toISOString().slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Preview rankings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating preview'
    });
  }
});

module.exports = router;
