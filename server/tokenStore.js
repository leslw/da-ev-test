import db from './db.js';

export function saveTokens({ accessToken, refreshToken, scope, expiresIn }) {
  const expiresAt = Date.now() + (Number(expiresIn) || 0) * 1000;
  db.prepare(`
    INSERT INTO tokens (id, access_token, refresh_token, scope, expires_at, updated_at)
    VALUES (1, @accessToken, @refreshToken, @scope, @expiresAt, @now)
    ON CONFLICT(id) DO UPDATE SET
      access_token  = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, tokens.refresh_token),
      scope         = excluded.scope,
      expires_at    = excluded.expires_at,
      updated_at    = excluded.updated_at
  `).run({ accessToken, refreshToken, scope, expiresAt, now: Date.now() });
}

export function getTokens() {
  return db.prepare('SELECT * FROM tokens WHERE id = 1').get();
}

export function clearTokens() {
  db.prepare('DELETE FROM tokens WHERE id = 1').run();
}

export function isAuthenticated() {
  const t = getTokens();
  return Boolean(t && t.access_token);
}
