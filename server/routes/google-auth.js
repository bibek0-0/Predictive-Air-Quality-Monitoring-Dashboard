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
    
    // Pass the return path to Google via the state parameter
    const returnTo = req.query.returnTo || '/';

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: returnTo
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

        // Get the original path from Google's state parameter
        let returnTo = req.query.state || '/';
        
        // Basic safety check for valid local paths
        if (!returnTo.startsWith('/')) {
            returnTo = '/';
        }

        // Check if khaltiIntent was encoded in the returnTo path
        let khaltiIntent = false;
        try {
            const returnUrl = new URL(returnTo, 'http://localhost');
            if (returnUrl.searchParams.get('khaltiIntent') === 'true') {
                khaltiIntent = true;
                returnUrl.searchParams.delete('khaltiIntent');
                returnTo = returnUrl.pathname + returnUrl.search;
            }
        } catch(e) {}

        // Redirect to frontend with token in query params
        // The frontend JS will pick up the token and store it
        const separator = returnTo.includes('?') ? '&' : '?';
        let redirectUrl = `${returnTo}${separator}token=${token}`;
        if (khaltiIntent) {
            redirectUrl += '&khaltiIntent=true';
        }
        res.redirect(redirectUrl);
    }
);

module.exports = router;
