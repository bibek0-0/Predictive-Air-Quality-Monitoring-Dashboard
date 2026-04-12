const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("./config/db");

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session (needed for Passport OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "airktm-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  }),
);

// Passport middleware
require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the project root
app.use(express.static(path.join(__dirname, "..")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth/google", require("./routes/google-auth"));
app.use("/api/payment/khalti", require("./routes/khalti"));

// Fallback: serve index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
