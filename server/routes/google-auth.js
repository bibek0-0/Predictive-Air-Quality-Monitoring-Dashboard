const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Helper: generate JWT token
function generateToken(user) {
    const payload = {
        user: {
            id: user.id
        }
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth flow
// @access  Public
router.get('/', (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        return res.status(503).json({ msg: 'Google Sign-In is not configured. Please add your Google OAuth credentials to .env' });
    }
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
});

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=error', session: false }),
    (req, res) => {
        // Generate JWT for the authenticated user
        const token = generateToken(req.user);

        // Redirect to frontend with token in query params
        // The frontend JS will pick up the token and store it
        res.redirect(`/?token=${token}`);
    }
);

module.exports = router;
