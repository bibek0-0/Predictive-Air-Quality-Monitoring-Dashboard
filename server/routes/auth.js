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
                avatar: user.avatar
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
                avatar: user.avatar
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

module.exports = router;
