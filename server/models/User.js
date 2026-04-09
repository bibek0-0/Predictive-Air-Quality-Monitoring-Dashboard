const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        // Not required for Google OAuth users
    },
    googleId: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    isPro: {
        type: Boolean,
        default: false
    },
    proActivatedAt: {
        type: Date,
        default: null
    },
    proTransactionId: {
        type: String,
        default: null
    },
    alertLocations: {
        type: [{
            type: String,
            enum: ['Ratnapark', 'Bhaisipati', 'Pulchowk', 'Shankapark', 'Bhaktapur']
        }],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
