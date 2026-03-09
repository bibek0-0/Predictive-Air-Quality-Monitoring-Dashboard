const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        console.error('Auth features will not work until MongoDB is running.');
        console.error('Start MongoDB and restart the server.');
    }
};

module.exports = connectDB;
