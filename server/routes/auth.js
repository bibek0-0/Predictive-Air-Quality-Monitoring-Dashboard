const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper: generate JWT token
function generateToken(user) {
    const payload = {
        user: {
            id: user.id
        }
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'Please provide name, email, and password' });
        }

        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters' });
        }

        // Password strength: must have at least one uppercase and one special character
        const hasUppercase = /[A-Z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        if (!hasUppercase) {
            return res.status(400).json({ msg: 'Password must contain at least one uppercase letter' });
        }
        if (!hasSpecialChar) {
            return res.status(400).json({ msg: 'Password must contain at least one special character (!@#$%^&* etc.)' });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'An account with this email already exists. Please log in instead.' });
        }

        // Create new user
        user = new User({ name, email, password });
        await user.save();

        // Generate token
        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isPro: user.isPro || false
            }
        });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ msg: 'Please provide email and password' });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'No account found with this email. Please sign up first.' });
        }

        // If user signed up with Google and has no password
        if (!user.password) {
            return res.status(400).json({ msg: 'This account uses Google Sign-In. Please log in with Google.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect password. Please try again.' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isPro: user.isPro || false
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET /api/auth/user
// @desc    Get current user info
// @access  Private (requires JWT)
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET /api/auth/pro-status
// @desc    Check if current user has Pro subscription
// @access  Private (requires JWT)
router.get('/pro-status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('isPro proActivatedAt proTransactionId');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({
            isPro: user.isPro || false,
            proActivatedAt: user.proActivatedAt,
            proTransactionId: user.proTransactionId
        });
    } catch (err) {
        console.error('Pro status check error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/pro-activate
// @desc    Activate Pro subscription for current user after successful payment
// @access  Private (requires JWT)
router.post('/pro-activate', auth, async (req, res) => {
    try {
        const { transactionId } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // If already Pro, just return success
        if (user.isPro) {
            return res.json({ msg: 'Pro subscription already active', isPro: true });
        }

        user.isPro = true;
        user.proActivatedAt = new Date();
        user.proTransactionId = transactionId || null;
        await user.save();

        res.json({
            msg: 'Pro subscription activated successfully',
            isPro: true,
            proActivatedAt: user.proActivatedAt,
            proTransactionId: user.proTransactionId
        });
    } catch (err) {
        console.error('Pro activate error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;

// @route   POST /api/auth/subscribe-alert
// @desc    Check if user exists for alert subscription and generate magic link if not
// @access  Public
router.post('/subscribe-alert', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ msg: 'Please provide an email' });
        }

        const user = await User.findOne({ email });

        if (user) {
            // User exists
            return res.json({ 
                success: false, 
                reason: 'already_registered', 
                message: 'You are already registered, buy pro by logging in.' 
            });
        }

        // Generate magic link token (short-lived, e.g., 1 hour)
        const payload = {
            email,
            action: 'magic-login'
        };
        const magicToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Generate the magic link URL
        const host = req.get('host');
        const protocol = req.protocol;
        const magicLink = `${protocol}://${host}/api/auth/magic-login?token=${magicToken}`;

        res.json({
            success: true,
            magicLink
        });

    } catch (err) {
        console.error('Subscribe alert error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET /api/auth/magic-login
// @desc    Handle magic link click, create/login user, redirect to home with khalti intent
// @access  Public
router.get('/magic-login', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Invalid or missing token.');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.action !== 'magic-login' || !decoded.email) {
            return res.status(400).send('Invalid token purpose.');
        }

        const email = decoded.email;
        const name = email.split('@')[0]; // Simple name extraction

        // Find or create user
        let user = await User.findOne({ email });

        if (!user) {
            // Create a new passwordless user (simulate Google/magic user)
            user = new User({
                name,
                email,
                googleId: 'magic_' + Date.now() // Dummy ID to indicate passwordless
            });
            await user.save();
        }

        // Generate auth token
        const authToken = generateToken(user);

        // Redirect to frontend with token and khalti intent
        res.redirect(`/?token=${authToken}&khaltiIntent=true`);

    } catch (err) {
        console.error('Magic login error:', err.message);
        return res.status(400).send('Link has expired or is invalid. Please try subscribing again.');
    }
});
