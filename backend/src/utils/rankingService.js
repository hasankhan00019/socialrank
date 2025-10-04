const { pool } = require('../config/database');

/**
 * Recalculate rankings for all institutions based on latest social metrics.
 * Uses the formula:
 *  follower_score = (followers / max_followers) * 50
 *  engagement_score = (engagement / max_engagement) * 50
 *  platform_score = follower_score + engagement_score
 *  combined_score = SUM(platform_score * platform_weight)
 *
 * @param {Object} options
 * @param {boolean} [options.publish=false] - Whether to mark rankings as published
 * @param {string|null} [options.calculationDate=null] - YYYY-MM-DD date for calculation (defaults to CURRENT_DATE)
 * @returns {Promise<{calculationDate: string, platformRows: number, combinedRows: number, published: boolean}>}
 */
async function recalculateRankings({ publish = false, calculationDate = null } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Determine calculation date
    const dateRow = await client.query('SELECT CURRENT_DATE::date AS today');
    const calcDate = calculationDate || dateRow.rows[0].today;

    // Remove any existing rankings for this calculation date to avoid duplicates
    await client.query('DELETE FROM rankings WHERE calculation_date = $1', [calcDate]);

    // Insert platform-specific rankings
    const platformInsertSQL = `
      WITH latest_metrics AS (
        SELECT DISTINCT ON (sm.account_id)
          sm.account_id,
          sa.institution_id,
          sa.platform_id,
          sm.followers_count,
          sm.engagement_rate,
          sm.monthly_growth,
          sm.total_engagement,
          sm.data_date
        FROM social_metrics sm
        JOIN social_accounts sa ON sa.id = sm.account_id
        ORDER BY sm.account_id, sm.data_date DESC
      ),
      platform_max AS (
        SELECT
          platform_id,
          MAX(followers_count) AS max_followers,
          MAX(engagement_rate) AS max_engagement,
          MAX(monthly_growth) AS max_growth
        FROM latest_metrics
        GROUP BY platform_id
      ),
      computed AS (
        SELECT
          lm.institution_id,
          lm.platform_id,
          CASE WHEN pm.max_followers > 0 THEN (lm.followers_count::numeric / pm.max_followers) * 50 ELSE 0 END AS follower_score,
          CASE WHEN pm.max_engagement > 0 THEN (lm.engagement_rate::numeric / pm.max_engagement) * 50 ELSE 0 END AS engagement_score,
          CASE WHEN pm.max_growth > 0 THEN (lm.monthly_growth::numeric / pm.max_growth) * 50 ELSE 0 END AS growth_score,
          COALESCE(lm.data_date, CURRENT_DATE) AS metric_date
        FROM latest_metrics lm
        JOIN platform_max pm ON pm.platform_id = lm.platform_id
      ),
      ranked AS (
        SELECT
          institution_id,
          platform_id,
          follower_score,
          engagement_score,
          growth_score,
          (follower_score + engagement_score) AS platform_score,
          ROW_NUMBER() OVER (
            PARTITION BY platform_id
            ORDER BY (follower_score + engagement_score) DESC, institution_id
          ) AS rank_position
        FROM computed
      )
      INSERT INTO rankings (
        institution_id,
        platform_id,
        ranking_type,
        rank_position,
        score,
        follower_score,
        engagement_score,
        growth_score,
        calculation_date,
        is_published,
        metadata
      )
      SELECT
        r.institution_id,
        r.platform_id,
        'platform_specific' AS ranking_type,
        r.rank_position,
        ROUND(r.platform_score::numeric, 2) AS score,
        ROUND(r.follower_score::numeric, 2),
        ROUND(r.engagement_score::numeric, 2),
        ROUND(r.growth_score::numeric, 2),
        $1::date AS calculation_date,
        $2::boolean AS is_published,
        '{}'::jsonb
      FROM ranked r;
    `;

    await client.query(platformInsertSQL, [calcDate, publish]);

    // Insert combined rankings (weighted by social_platforms.weight for active platforms)
    const combinedInsertSQL = `
      WITH latest_platform_scores AS (
        SELECT
          institution_id,
          platform_id,
          (follower_score + engagement_score) AS platform_score
        FROM rankings
        WHERE ranking_type = 'platform_specific'
          AND calculation_date = $1
      ),
      active_platforms AS (
        SELECT id, weight
        FROM social_platforms
        WHERE is_active = true
      ),
      combined_scores AS (
        SELECT
          lps.institution_id,
          SUM(lps.platform_score * COALESCE(ap.weight, 1.0)) AS total_score
        FROM latest_platform_scores lps
        JOIN active_platforms ap ON ap.id = lps.platform_id
        GROUP BY lps.institution_id
      ),
      ranked_combined AS (
        SELECT
          institution_id,
          total_score,
          ROW_NUMBER() OVER (ORDER BY total_score DESC, institution_id) AS rank_position
        FROM combined_scores
      )
      INSERT INTO rankings (
        institution_id,
        platform_id,
        ranking_type,
        rank_position,
        score,
        follower_score,
        engagement_score,
        growth_score,
        calculation_date,
        is_published,
        metadata
      )
      SELECT
        rc.institution_id,
        NULL::int AS platform_id,
        'combined' AS ranking_type,
        rc.rank_position,
        ROUND(rc.total_score::numeric, 2) AS score,
        0, 0, 0,
        $1::date,
        $2::boolean,
        '{}'::jsonb
      FROM ranked_combined rc
      ORDER BY rc.rank_position;
    `;

    await client.query(combinedInsertSQL, [calcDate, publish]);

    const countsResult = await client.query(
      `SELECT
         SUM(CASE WHEN ranking_type = 'platform_specific' THEN 1 ELSE 0 END) AS platform_rows,
         SUM(CASE WHEN ranking_type = 'combined' THEN 1 ELSE 0 END) AS combined_rows
       FROM rankings
       WHERE calculation_date = $1`,
      [calcDate]
    );

    await client.query('COMMIT');

    return {
      calculationDate: String(calcDate),
      platformRows: parseInt(countsResult.rows[0]?.platform_rows || 0),
      combinedRows: parseInt(countsResult.rows[0]?.combined_rows || 0),
      published: Boolean(publish)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { recalculateRankings };
