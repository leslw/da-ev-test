import express from 'express';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import { config, uberConfigured } from '../config.js';
import { saveTokens, clearTokens, isAuthenticated } from '../tokenStore.js';

// Passport OAuth2 strategy for the Uber Driver API (Authorization Code flow).
if (uberConfigured()) {
  const strategy = new OAuth2Strategy(
    {
      authorizationURL: config.uber.authorizationUrl,
      tokenURL: config.uber.tokenUrl,
      clientID: config.uber.clientId,
      clientSecret: config.uber.clientSecret,
      callbackURL: config.uber.redirectUri,
      scope: config.uber.scopes,
      scopeSeparator: ' ',
    },
    (accessToken, refreshToken, params, profile, done) => {
      // Persist tokens server-side only — never exposed to the frontend.
      saveTokens({
        accessToken,
        refreshToken,
        scope: params?.scope,
        expiresIn: params?.expires_in,
      });
      return done(null, { id: 'uber-driver' });
    },
  );
  passport.use('uber', strategy);
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const router = express.Router();

router.get('/uber', (req, res, next) => {
  if (!uberConfigured()) {
    return res.status(503).json({
      error: 'Uber OAuth not configured. Set UBER_CLIENT_ID / UBER_CLIENT_SECRET in .env.',
    });
  }
  passport.authenticate('uber')(req, res, next);
});

router.get(
  '/uber/callback',
  (req, res, next) => {
    if (!uberConfigured()) return res.redirect('/?auth=unconfigured');
    next();
  },
  passport.authenticate('uber', { session: true, failureRedirect: '/?auth=failed' }),
  (req, res) => res.redirect('/?auth=success'),
);

router.get('/status', (req, res) => {
  res.json({ configured: uberConfigured(), authenticated: isAuthenticated() });
});

router.post('/logout', (req, res) => {
  clearTokens();
  res.json({ ok: true });
});

export default router;
