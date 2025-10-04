const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`Loading schema from: ${schemaPath}`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Database schema loaded successfully.');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to load database schema:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
})();
