import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
  if (!pool) {
    // Soporta Railway MySQL (MYSQL_*) y variables propias (DB_*)
    pool = mysql.createPool({
      host:     process.env.MYSQL_HOST     || process.env.DB_HOST,
      user:     process.env.MYSQL_USER     || process.env.DB_USER,
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
      port:     Number(process.env.MYSQL_PORT || process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: 'Z',
    });
  }
  return pool;
}

export async function initDB() {
  const db = getPool();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ommy_sessions (
      session_id  VARCHAR(64)  PRIMARY KEY,
      messages    JSON         NOT NULL DEFAULT ('[]'),
      lang        VARCHAR(5)   DEFAULT 'es',
      last_activity BIGINT,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('DB: tabla ommy_sessions lista');
}

export async function loadSession(sessionId) {
  const db = getPool();
  const [rows] = await db.execute(
    'SELECT messages, lang FROM ommy_sessions WHERE session_id = ?',
    [sessionId]
  );
  if (rows.length === 0) return null;
  return {
    messages: JSON.parse(rows[0].messages),
    lang: rows[0].lang,
  };
}

export async function saveSession(sessionId, messages, lang) {
  const db = getPool();
  await db.execute(
    `INSERT INTO ommy_sessions (session_id, messages, lang, last_activity)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE messages = VALUES(messages), lang = VALUES(lang), last_activity = VALUES(last_activity)`,
    [sessionId, JSON.stringify(messages), lang, Date.now()]
  );
}

export async function deleteSession(sessionId) {
  const db = getPool();
  await db.execute('DELETE FROM ommy_sessions WHERE session_id = ?', [sessionId]);
}

export async function cleanOldSessions() {
  const db = getPool();
  const cutoff = Date.now() - 30 * 60 * 1000;
  await db.execute('DELETE FROM ommy_sessions WHERE last_activity < ?', [cutoff]);
}
