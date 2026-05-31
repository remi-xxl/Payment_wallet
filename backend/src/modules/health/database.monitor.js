import prisma from '../../utils/prisma.js';
import logger from '../../config/logger.js'

// Collects database performance metrics.
// Run these periodically to track database health over time.



// Gets key database performance statistics.
// These numbers tell you if your database is healthy.
export async function getDatabaseStats() {
  try {

    // ── TABLE SIZES ─────────────────────────────────────────
    // Shows how much disk space each table uses.
    // Large tables need more memory and take longer to query.
    const tableSizes = await prisma.$queryRaw`
      SELECT
        relname                                    AS table_name,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_size_pretty(pg_relation_size(relid))       AS table_size,
        pg_size_pretty(
          pg_total_relation_size(relid) -
          pg_relation_size(relid)
        )                                          AS index_size,
        n_live_tup                                 AS live_rows,
        n_dead_tup                                 AS dead_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
    `;

    // ── INDEX USAGE ─────────────────────────────────────────
    // Shows whether your indexes are actually being used.
    // An index that is never used wastes space and slows writes.
    // seq_scan = full table scan (bad for large tables)
    // idx_scan = index scan (good — fast)
    const indexUsage = await prisma.$queryRaw`
      SELECT
        relname        AS table_name,
        seq_scan       AS full_table_scans,
        idx_scan       AS index_scans,
        n_live_tup     AS total_rows,
        CASE
          WHEN seq_scan + idx_scan = 0 THEN 0
          ELSE ROUND(
            100.0 * idx_scan / (seq_scan + idx_scan), 2
          )
        END            AS index_usage_percentage
      FROM pg_stat_user_tables
      ORDER BY seq_scan DESC
    `;

    // ── CACHE HIT RATE ───────────────────────────────────────
    // PostgreSQL caches frequently accessed data in memory.
    // A high cache hit rate means most queries are served from
    // memory (fast) not disk (slow).
    // Target: above 99% for a production database.
    const cacheHitRate = await prisma.$queryRaw`
      SELECT
        sum(heap_blks_read)  AS disk_reads,
        sum(heap_blks_hit)   AS cache_hits,
        CASE
          WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0
          THEN 0
          ELSE ROUND(
            100.0 * sum(heap_blks_hit) /
            (sum(heap_blks_hit) + sum(heap_blks_read)),
            2
          )
        END                  AS cache_hit_percentage
      FROM pg_statio_user_tables
    `;

    // ── CONNECTION STATS ─────────────────────────────────────
    // Shows active, idle, and waiting connections.
    // Too many connections = performance problems.
    // Connections in state "idle in transaction" = potential issue
    // (transactions left open accidentally)
    const connectionStats = await prisma.$queryRaw`
      SELECT
        state,
        COUNT(*) AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
      ORDER BY count DESC
    `;

    // ── LONG RUNNING QUERIES ─────────────────────────────────
    // Queries running for more than 30 seconds are problematic.
    // They lock tables, use resources, and slow everything down.
    const longRunningQueries = await prisma.$queryRaw`
      SELECT
        pid,
        EXTRACT(EPOCH FROM now() - pg_stat_activity.query_start) AS duration_seconds,
        LEFT(query, 200) AS query,
        state
      FROM pg_stat_activity
      WHERE
        (now() - pg_stat_activity.query_start) > interval '30 seconds'
        AND state != 'idle'
        AND datname = current_database()
      ORDER BY duration_seconds DESC
    `;

    // Log warnings for concerning metrics
    const cacheHit = Number(cacheHitRate[0]?.cache_hit_percentage || 0);
    if (cacheHit < 99) {
      logger.warn('Low database cache hit rate', {
        cacheHitPercentage: `${cacheHit}%`,
        recommendation:     'Consider increasing shared_buffers in PostgreSQL config',
      });
    }

    if (longRunningQueries.length > 0) {
      logger.warn('Long running queries detected', {
        count:   longRunningQueries.length,
        queries: longRunningQueries,
      });
    }

    return {
      tableSizes,
      indexUsage,
      cacheHitRate:       cacheHitRate[0],
      connectionStats,
      longRunningQueries,
    };

  } catch (error) {
    logger.error('Failed to get database stats', { error: error.message });
    throw error;
  }
}