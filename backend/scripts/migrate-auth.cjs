const fs = require('node:fs/promises');
const path = require('node:path');
const ID = '005_unified_auth';
const quote = name => {
  if (!/^[a-zA-Z0-9_]+$/.test(name))
    throw new Error('Invalid schema identifier');
  return '`' + name + '`';
};
async function table(conn, name) {
  const [r] = await conn.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?',
    [name],
  );
  return !!r.length;
}
async function applied(conn) {
  if (!(await table(conn, 'app_migrations'))) return false;
  const [r] = await conn.query('SELECT 1 FROM app_migrations WHERE id=?', [ID]);
  return !!r.length;
}
async function column(conn, t, c, definition) {
  const [rows] = await conn.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',
    [t, c],
  );
  if (!rows.length)
    await conn.query(
      'ALTER TABLE ' + quote(t) + ' ADD COLUMN ' + quote(c) + ' ' + definition,
    );
}
async function migrateAuth(conn) {
  const [locks] = await conn.query(
    "SELECT GET_LOCK(CONCAT(DATABASE(),':unified-auth'),10) locked",
  );
  if (!locks[0].locked) throw new Error('Another auth migration is running');
  try {
    await conn.query(
      await fs.readFile(
        path.join(__dirname, '../sql/migrations/005_unified_auth.sql'),
        'utf8',
      ),
    );
    await column(conn, 'users', 'active', 'BOOLEAN NOT NULL DEFAULT TRUE');
    await column(conn, 'refresh_tokens', 'session_id', 'CHAR(36) NULL');
    const [indexes] = await conn.query(
      "SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='refresh_tokens' AND index_name='session_lookup'",
    );
    if (!indexes.length)
      await conn.query(
        'ALTER TABLE refresh_tokens ADD INDEX session_lookup(user_id,session_id,revoked_at,expires_at)',
      );
    if (!(await applied(conn))) {
      const hasAccounts = await table(conn, 'community_accounts'),
        hasAuth = await table(conn, 'auth_users');
      const [accounts] = hasAccounts
        ? await conn.query(
            'SELECT CAST(user_id AS CHAR) user_id,nickname,active FROM community_accounts ORDER BY user_id',
          )
        : [[]];
      const [identities] = hasAuth
        ? await conn.query(
            'SELECT CAST(user_id AS CHAR) user_id,kakao_id,profile_image_url FROM auth_users',
          )
        : [[]];
      const identity = new Map(identities.map(r => [String(r.user_id), r]));
      // Drop only the old community identity FKs. New FKs are always restored below, even after a restart.
      const [keys] = await conn.query(
        "SELECT TABLE_NAME,CONSTRAINT_NAME FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND referenced_table_name='community_accounts' AND TABLE_NAME IN ('community_reviews','community_review_comments','community_review_likes','cafe_price_requests')",
      );
      for (const k of keys)
        await conn.query(
          'ALTER TABLE ' +
            quote(k.TABLE_NAME) +
            ' DROP FOREIGN KEY ' +
            quote(k.CONSTRAINT_NAME),
        );
      await conn.query(
        'CREATE TEMPORARY TABLE IF NOT EXISTS auth_migration_likes AS SELECT * FROM community_review_likes',
      );
      await conn.beginTransaction();
      try {
        for (const a of accounts) {
          const auth = identity.get(String(a.user_id));
          const kakao = auth
            ? String(auth.kakao_id)
            : 'legacy-local-' + String(a.user_id);
          // Match by provider identity, NEVER by an overlapping numeric ID.
          await conn.query(
            `INSERT INTO users(kakao_id,nickname,profile_image_url,active) VALUES(?,?,?,?) AS incoming
       ON DUPLICATE KEY UPDATE active=LEAST(users.active,incoming.active)`,
            [
              kakao,
              a.nickname,
              auth?.profile_image_url ?? null,
              auth ? !!a.active : false,
            ],
          );
          const [u] = await conn.query(
            'SELECT CAST(user_id AS CHAR) user_id FROM users WHERE kakao_id=?',
            [kakao],
          );
          await conn.query(
            'INSERT INTO legacy_community_user_map(legacy_id,user_id) VALUES(?,?)',
            [a.user_id, u[0].user_id],
          );
        }
        for (const t of [
          'community_reviews',
          'community_review_comments',
          'cafe_price_requests',
        ]) {
          const [missing] = await conn.query(
            'SELECT COUNT(*) n FROM ' +
              quote(t) +
              ' t LEFT JOIN legacy_community_user_map m ON m.legacy_id=t.author_id WHERE t.author_id IS NOT NULL AND m.user_id IS NULL',
          );
          if (Number(missing[0].n)) throw new Error('Unmapped authors in ' + t);
          await conn.query(
            'UPDATE ' +
              quote(t) +
              ' t JOIN legacy_community_user_map m ON m.legacy_id=t.author_id SET t.author_id=m.user_id',
          );
        }
        const [missingLikes] = await conn.query(
          'SELECT COUNT(*) n FROM auth_migration_likes l LEFT JOIN legacy_community_user_map m ON m.legacy_id=l.user_id WHERE m.user_id IS NULL',
        );
        if (Number(missingLikes[0].n)) throw new Error('Unmapped likes');
        await conn.query('DELETE FROM community_review_likes');
        await conn.query(
          'INSERT INTO community_review_likes(review_id,user_id) SELECT DISTINCT l.review_id,m.user_id FROM auth_migration_likes l JOIN legacy_community_user_map m ON m.legacy_id=l.user_id',
        );
        // Old signatures/session formats are deliberately retired. Existing users log in again.
        await conn.query(
          'UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE session_id IS NULL',
        );
        await conn.query('DELETE FROM auth_login_flows');
        await conn.query('INSERT INTO app_migrations(id) VALUES(?)', [ID]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }
      await conn.query('DROP TEMPORARY TABLE auth_migration_likes');
    }
    for (const [t, c, name] of [
      ['community_reviews', 'author_id', 'fk_review_user'],
      ['community_review_comments', 'author_id', 'fk_comment_user'],
      ['community_review_likes', 'user_id', 'fk_like_user'],
      ['cafe_price_requests', 'author_id', 'fk_price_request_user'],
    ]) {
      const [keys] = await conn.query(
        "SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name=? AND column_name=? AND referenced_table_name='users'",
        [t, c],
      );
      if (!keys.length)
        await conn.query(
          'ALTER TABLE ' +
            quote(t) +
            ' ADD CONSTRAINT ' +
            quote(name) +
            ' FOREIGN KEY (' +
            quote(c) +
            ') REFERENCES users(user_id)',
        );
    }
    // Non-destructive archive: no runtime code reads or writes these legacy identities/sessions.
    for (const t of ['auth_sessions', 'auth_users', 'community_accounts']) {
      if (await table(conn, t)) {
        if (await table(conn, 'legacy_' + t))
          throw new Error('Archive already exists for ' + t);
        await conn.query(
          'RENAME TABLE ' + quote(t) + ' TO ' + quote('legacy_' + t),
        );
      }
    }
  } finally {
    await conn.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':unified-auth'))");
  }
}
module.exports = { migrateAuth, authMigrationApplied: applied };
