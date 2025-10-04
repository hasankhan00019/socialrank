const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Create upload directory if it doesn't exist
const createUploadDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    await createUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Upload single image (admin only)
router.post('/image', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  upload.single('image')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { filename, originalname, mimetype, size } = req.file;
    const storagePath = `/uploads/images/${filename}`;

    // Save file info to database
    const result = await pool.query(`
      INSERT INTO media_files 
      (filename, original_name, file_type, file_size, mime_type, storage_path, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, filename, storage_path, created_at
    `, [filename, originalname, 'image', size, mimetype, storagePath, req.user.id]);

    const fileInfo = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: fileInfo.id,
        filename: fileInfo.filename,
        url: `${req.protocol}://${req.get('host')}${fileInfo.storage_path}`,
        storage_path: fileInfo.storage_path,
        created_at: fileInfo.created_at
      }
    });

  } catch (error) {
    console.error('Upload image error:', error);

    // Clean up uploaded file if database insert failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error uploading image'
    });
  }
});

// Upload multiple images (admin only)
router.post('/images', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor']),
  upload.array('images', 5) // Max 5 images
], async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const file of req.files) {
        const { filename, originalname, mimetype, size } = file;
        const storagePath = `/uploads/images/${filename}`;

        const result = await client.query(`
          INSERT INTO media_files 
          (filename, original_name, file_type, file_size, mime_type, storage_path, uploaded_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, filename, storage_path, created_at
        `, [filename, originalname, 'image', size, mimetype, storagePath, req.user.id]);

        const fileInfo = result.rows[0];
        uploadedFiles.push({
          id: fileInfo.id,
          filename: fileInfo.filename,
          url: `${req.protocol}://${req.get('host')}${fileInfo.storage_path}`,
          storage_path: fileInfo.storage_path,
          created_at: fileInfo.created_at
        });
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} images uploaded successfully`,
        data: uploadedFiles
      });

    } catch (dbError) {
      await client.query('ROLLBACK');

      // Clean up uploaded files
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Upload multiple images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading images'
    });
  }
});

// Get all uploaded media files (admin only)
router.get('/media', [
  authenticate,
  authorize(['super_admin', 'admin', 'editor'])
], async (req, res) => {
  try {
    const query = `
      SELECT 
        mf.id, mf.filename, mf.original_name, mf.file_type, 
        mf.file_size, mf.storage_path, mf.created_at,
        u.name as uploaded_by_name
      FROM media_files mf
      LEFT JOIN users u ON mf.uploaded_by = u.id
      ORDER BY mf.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    const mediaFiles = result.rows.map(file => ({
      ...file,
      url: `${req.protocol}://${req.get('host')}${file.storage_path}`,
      file_size_mb: Math.round((file.file_size / 1024 / 1024) * 100) / 100
    }));

    res.json({
      success: true,
      data: mediaFiles
    });

  } catch (error) {
    console.error('Get media files error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching media files'
    });
  }
});

// Delete media file (admin only)
router.delete('/media/:id', [
  authenticate,
  authorize(['super_admin', 'admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    // Get file info before deletion
    const fileResult = await pool.query(
      'SELECT filename, storage_path FROM media_files WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    const fileInfo = fileResult.rows[0];
    const filePath = path.join(process.cwd(), fileInfo.storage_path);

    // Delete from database
    await pool.query('DELETE FROM media_files WHERE id = $1', [id]);

    // Delete physical file
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('File may already be deleted:', fileError.message);
    }

    res.json({
      success: true,
      message: 'Media file deleted successfully'
    });

  } catch (error) {
    console.error('Delete media file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting media file'
    });
  }
});

module.exports = router;
