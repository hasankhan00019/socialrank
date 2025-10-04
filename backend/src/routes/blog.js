const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all published blog posts (public)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('tag').optional(),
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { tag, search } = req.query;

    let whereClause = "WHERE bp.status = 'published'";
    let queryParams = [];
    let paramCount = 0;

    if (tag) {
      paramCount++;
      whereClause += ` AND $${paramCount} = ANY(bp.tags)`;
      queryParams.push(tag);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (bp.title ILIKE $${paramCount} OR bp.excerpt ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    queryParams.push(limit, offset);

    const query = `
      SELECT 
        bp.id, bp.title, bp.slug, bp.excerpt, bp.featured_image,
        bp.tags, bp.published_at, bp.created_at,
        u.name as author_name,
        COUNT(*) OVER() as total_count
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      ${whereClause}
      ORDER BY bp.published_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const result = await pool.query(query, queryParams);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const posts = result.rows.map(row => {
      const { total_count, ...post } = row;
      return post;
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_count: totalCount,
          per_page: limit
        }
      }
    });

  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching blog posts'
    });
  }
});

// Get single blog post by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT 
        bp.id, bp.title, bp.slug, bp.content, bp.excerpt, bp.featured_image,
        bp.tags, bp.meta_title, bp.meta_description,
        bp.published_at, bp.created_at, bp.updated_at,
        u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      WHERE bp.slug = $1 AND bp.status = 'published'
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching blog post'
    });
  }
});

// Get all posts for admin (admin only)
router.get('/admin/all', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  query('status').optional().isIn(['draft', 'published', 'archived'])
], async (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = '';
    let queryParams = [];

    if (status) {
      whereClause = 'WHERE bp.status = $1';
      queryParams.push(status);
    }

    const query = `
      SELECT 
        bp.id, bp.title, bp.slug, bp.status, bp.tags,
        bp.published_at, bp.created_at, bp.updated_at,
        u.name as author_name
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      ${whereClause}
      ORDER BY bp.updated_at DESC
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get admin blog posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching blog posts'
    });
  }
});

// Create new blog post (admin only)
router.post('/', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  body('title').notEmpty().isLength({ max: 500 }),
  body('slug').notEmpty().isLength({ max: 500 }),
  body('content').notEmpty(),
  body('status').isIn(['draft', 'published', 'archived'])
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
      title, slug, content, excerpt, featured_image, tags = [],
      meta_title, meta_description, status
    } = req.body;

    // Check if slug already exists
    const existingPost = await pool.query(
      'SELECT id FROM blog_posts WHERE slug = $1',
      [slug]
    );

    if (existingPost.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Slug already exists'
      });
    }

    const published_at = status === 'published' ? new Date() : null;

    const result = await pool.query(`
      INSERT INTO blog_posts 
      (title, slug, content, excerpt, featured_image, author_id, status, 
       tags, meta_title, meta_description, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, title, slug, status, created_at
    `, [title, slug, content, excerpt, featured_image, req.user.id, status,
        tags, meta_title, meta_description, published_at]);

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating blog post'
    });
  }
});

// Update blog post (admin only)
router.put('/:id', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  body('title').optional().isLength({ max: 500 }),
  body('slug').optional().isLength({ max: 500 }),
  body('status').optional().isIn(['draft', 'published', 'archived'])
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

    const allowedFields = [
      'title', 'slug', 'content', 'excerpt', 'featured_image',
      'tags', 'meta_title', 'meta_description', 'status'
    ];

    // Check if slug is unique (if being updated)
    if (req.body.slug) {
      const existingPost = await pool.query(
        'SELECT id FROM blog_posts WHERE slug = $1 AND id != $2',
        [req.body.slug, id]
      );

      if (existingPost.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
      }
    });

    // Handle published_at update
    if (req.body.status === 'published') {
      const currentPost = await pool.query(
        'SELECT status, published_at FROM blog_posts WHERE id = $1',
        [id]
      );

      if (currentPost.rows.length > 0 && currentPost.rows[0].status !== 'published') {
        paramCount++;
        updateFields.push(`published_at = $${paramCount}`);
        values.push(new Date());
      }
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
      UPDATE blog_posts 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, title, slug, status, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating blog post'
    });
  }
});

// Delete blog post (admin only)
router.delete('/:id', [
  authenticate,
  authorize(['super_admin', 'admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM blog_posts WHERE id = $1 RETURNING id, title',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog post deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting blog post'
    });
  }
});

module.exports = router;
