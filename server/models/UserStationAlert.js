const mongoose = require('mongoose');

const userStationAlertSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        station: {
            type: String,
            required: true,
            enum: ['Ratnapark', 'Bhaisipati', 'Pulchowk', 'Shankapark', 'Bhaktapur']
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: false,
        collection: 'user_station_alerts'
    }
);

userStationAlertSchema.index({ userId: 1, station: 1 }, { unique: true });

module.exports = mongoose.model('UserStationAlert', userStationAlertSchema);
