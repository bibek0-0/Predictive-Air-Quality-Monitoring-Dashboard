const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const auth = require('../middleware/auth');

// Admin-only middleware
const adminAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ msg: 'Admin access required' });
        }
        next();
    } catch (err) {
        res.status(500).json({ msg: 'Server error' });
    }
};

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

        // Check for admin login via .env credentials
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
            // Find or create admin user in DB
            let adminUser = await User.findOne({ email: adminEmail });
            if (!adminUser) {
                adminUser = new User({
                    name: 'Admin',
                    email: adminEmail,
                    isAdmin: true
                });
                await adminUser.save();
            } else if (!adminUser.isAdmin) {
                adminUser.isAdmin = true;
                await adminUser.save();
            }
            const token = generateToken(adminUser);
            return res.json({
                token,
                user: {
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                    avatar: adminUser.avatar,
                    isPro: adminUser.isPro || false,
                    isAdmin: true
                }
            });
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
                isPro: user.isPro || false,
                isAdmin: user.isAdmin || false
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Helper: check Pro expiry (1 month duration)
const checkProExpiry = async (user) => {
    if (user.isPro && user.proActivatedAt) {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(user.proActivatedAt).getTime() > thirtyDaysMs) {
            user.isPro = false;
            user.alertLocations = [];
            await user.save();
        }
    }
    return user;
};

// @route   GET /api/auth/user
// @desc    Get current user info
// @access  Private (requires JWT)
router.get('/user', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        user = await checkProExpiry(user);
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
        let user = await User.findById(req.user.id).select('isPro proActivatedAt proTransactionId alertLocations');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        user = await checkProExpiry(user);
        res.json({
            isPro: user.isPro || false,
            proActivatedAt: user.proActivatedAt,
            proTransactionId: user.proTransactionId,
            alertLocations: user.alertLocations || []
        });
    } catch (err) {
        console.error('Pro status check error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET /api/auth/email-alert-count
// @desc    Total AQI alert emails sent to this user (Mongo subscribers), Pro only
// @access  Private
router.get('/email-alert-count', auth, async (req, res) => {
    try {
        let user = await User.findById(req.user.id).select('email isPro');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        user = await checkProExpiry(user);
        if (!user.isPro) {
            return res.status(403).json({ msg: 'Pro subscription required' });
        }
        const email = (user.email || '').toLowerCase().trim();
        if (!email) {
            return res.json({ total: 0 });
        }
        const subs = await Subscriber.find({ email }).select('email_alerts_sent').lean();
        const total = subs.reduce((sum, s) => sum + (Number(s.email_alerts_sent) || 0), 0);
        res.json({ total });
    } catch (err) {
        console.error('Email alert count error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/pro-activate
// @desc    Activate Pro subscription for current user after successful payment
// @access  Private (requires JWT)
router.post('/pro-activate', auth, async (req, res) => {
    try {
        const { transactionId, alertLocation } = req.body;

        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user = await checkProExpiry(user);

        // If activating for the first time or re-activating after expiry
        if (!user.isPro) {
            user.isPro = true;
            user.proActivatedAt = new Date();
            user.alertLocations = []; // Reset on fresh activation
        }

        user.proTransactionId = transactionId || null;
        if (alertLocation && (!user.alertLocations || !user.alertLocations.includes(alertLocation))) {
            user.alertLocations.push(alertLocation);
        }
        await user.save();

        res.json({
            msg: 'Pro subscription activated successfully',
            isPro: true,
            proActivatedAt: user.proActivatedAt,
            proTransactionId: user.proTransactionId,
            alertLocations: user.alertLocations
        });
    } catch (err) {
        console.error('Pro activate error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   PUT /api/auth/alert-location
// @desc    Update alert location for Pro users
// @access  Private (requires JWT)
router.put('/alert-location', auth, async (req, res) => {
    try {
        const { alertLocation } = req.body;
        const validLocations = ['Ratnapark', 'Bhaisipati', 'Pulchowk', 'Shankapark', 'Bhaktapur'];

        if (!alertLocation || !validLocations.includes(alertLocation)) {
            return res.status(400).json({ msg: 'Invalid location' });
        }

        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        user = await checkProExpiry(user);

        if (!user.isPro) {
            return res.status(403).json({ msg: 'Pro subscription required or expired' });
        }

        if (!user.alertLocations) user.alertLocations = [];
        
        if (!user.alertLocations.includes(alertLocation)) {
            user.alertLocations.push(alertLocation);
            await user.save();
        }

        res.json({
            msg: 'Alert location added successfully',
            alertLocations: user.alertLocations
        });
    } catch (err) {
        console.error('Alert location update error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// =============================================
// ADMIN API ROUTES
// =============================================

// @route   GET /api/auth/admin/users
// @desc    Get all users for admin panel
// @access  Private (Admin only)
router.get('/admin/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: { $ne: true } })
            .select('-password -googleId -__v')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error('Admin users error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET /api/auth/admin/stats
// @desc    Get dashboard statistics for admin panel
// @access  Private (Admin only)
router.get('/admin/stats', auth, adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isAdmin: { $ne: true } });
        const proUsers = await User.countDocuments({ isPro: true, isAdmin: { $ne: true } });

        // Calculate revenue: count total alertLocations across all pro users
        const proUsersData = await User.find({ isPro: true, isAdmin: { $ne: true } })
            .select('alertLocations proActivatedAt createdAt');

        let totalLocations = 0;
        const monthlyRevenue = {};

        proUsersData.forEach(u => {
            const locs = (u.alertLocations || []).length;
            totalLocations += locs;

            // Group revenue by month
            const date = u.proActivatedAt || u.createdAt;
            if (date) {
                const key = new Date(date).toISOString().slice(0, 7); // YYYY-MM
                monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (locs * 100);
            }
        });

        const totalRevenue = totalLocations * 100; // NRS 100 per location

        const subscriberCount = await Subscriber.countDocuments();

        res.json({
            totalUsers,
            proUsers,
            totalRevenue,
            totalLocations,
            subscriberCount,
            monthlyRevenue
        });
    } catch (err) {
        console.error('Admin stats error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   GET /api/auth/admin/subscribers
// @desc    Get Flask email subscribers for admin panel
// @access  Private (Admin only)
router.get('/admin/subscribers', auth, adminAuth, async (req, res) => {
    try {
        const subscribers = await Subscriber.find({})
            .select('-__v')
            .sort({ subscribed_at: -1 })
            .lean();
        res.json({ subscribers });
    } catch (err) {
        console.error('Admin subscribers error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST /api/auth/subscribe-alert
// @desc    Check if user exists for alert subscription and generate magic link if not
// @access  Public (logged-in referrer for personalized invite email)
router.post('/subscribe-alert', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ msg: 'Please provide an email' });
        }

        const inviteeLower = String(email).trim().toLowerCase();
        let referrer = null;
        const authHeader = req.header('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const refUser = await User.findById(decoded.user.id).select('name email');
                if (refUser && refUser.email) {
                    const refLower = refUser.email.toLowerCase();
                    if (refLower !== inviteeLower) {
                        const displayName = (refUser.name && refUser.name.trim())
                            ? refUser.name.trim()
                            : refUser.email.split('@')[0];
                        referrer = { name: displayName, email: refUser.email };
                    }
                }
            } catch (e) {
                /* invalid/expired token treat as anonymous invite */
            }
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
            magicLink,
            referrer
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

module.exports = router;
