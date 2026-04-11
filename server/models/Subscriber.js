const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        station: {
            type: String,
            required: true
        },
        subscribed_at: { type: String, default: null },
        last_alerted_aqi: { type: Number, default: null },
        last_alerted_category: { type: String, default: null },
        last_alert_sent_at: { type: String, default: null },
        email_alerts_sent: { type: Number, default: 0 }
    },
    {
        timestamps: false,
        collection: 'subscribers'
    }
);

subscriberSchema.index({ email: 1, station: 1 }, { unique: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
