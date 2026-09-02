const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================
// ADMIN LOGIN DETAILS
// =====================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MedicareAdmin2026";

// =====================================
// MIDDLEWARE
// =====================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =====================================
// ROOT ROUTE
// =====================================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// =====================================
// MYSQL CONNECTION
// =====================================
let db;

if (process.env.DATABASE_URL) {
    db = mysql.createConnection(process.env.DATABASE_URL);
    console.log("🔗 Using Railway MySQL");
} else {
    db = mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "medicare_db",
        port: process.env.DB_PORT || 3306
    });
    console.log("🔗 Using Local MySQL");
}

// =====================================
// CONNECT TO DATABASE
// =====================================
db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
        return;
    }
    console.log("✅ Connected to Medicare database!");
    
    // Create tables if they don't exist
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            sender VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'unread',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    const createAppointmentsTable = `
        CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            doctor_name VARCHAR(100) NOT NULL,
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            reason VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    
    db.query(createUsersTable, (err) => {
        if (err) console.error("❌ Error creating users table:", err.message);
        else console.log("✅ Users table ready");
    });
    
    db.query(createMessagesTable, (err) => {
        if (err) console.error("❌ Error creating messages table:", err.message);
        else console.log("✅ Messages table ready");
    });
    
    db.query(createAppointmentsTable, (err) => {
        if (err) console.error("❌ Error creating appointments table:", err.message);
        else console.log("✅ Appointments table ready");
    });
});

// =====================================
// TEST API
// =====================================
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Medicare API is working!"
    });
});

// =====================================
// USER REGISTRATION
// =====================================
app.post("/api/register", (req, res) => {
    console.log("📝 REGISTRATION REQUEST");
    console.log("Body:", req.body);

    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Full name, email, and password are required."
        });
    }

    // Simple password hashing (for demo - use bcrypt in production)
    const hashedPassword = Buffer.from(password).toString('base64');

    const sql = `
        INSERT INTO users (full_name, email, password, phone)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [full_name, email, hashedPassword, phone || null], (err, result) => {
        if (err) {
            console.error("❌ Error saving user:", err.message);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: "Email already registered."
                });
            }
            return res.status(500).json({
                success: false,
                message: "Could not save user."
            });
        }

        console.log("✅ User saved! ID:", result.insertId);
        res.json({
            success: true,
            message: "User registered successfully!",
            id: result.insertId
        });
    });
});

// =====================================
// USER LOGIN
// =====================================
app.post("/api/login", (req, res) => {
    console.log("🔑 LOGIN REQUEST");
    console.log("Body:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    const hashedPassword = Buffer.from(password).toString('base64');

    const sql = `
        SELECT id, full_name, email, phone, created_at
        FROM users
        WHERE email = ? AND password = ?
    `;

    db.query(sql, [email, hashedPassword], (err, results) => {
        if (err) {
            console.error("❌ Error logging in:", err.message);
            return res.status(500).json({
                success: false,
                message: "Could not login."
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        console.log("✅ User logged in:", results[0].email);
        res.json({
            success: true,
            message: "Login successful!",
            user: results[0]
        });
    });
});

// =====================================
// SEND MESSAGE
// =====================================
app.post("/api/messages", (req, res) => {
    console.log("💬 NEW MESSAGE");
    console.log("Body:", req.body);

    const { user_id, sender, message } = req.body;

    if (!user_id || !sender || !message) {
        return res.status(400).json({
            success: false,
            message: "User ID, sender, and message are required."
        });
    }

    const sql = `
        INSERT INTO messages (user_id, sender, message)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [user_id, sender, message], (err, result) => {
        if (err) {
            console.error("❌ Error saving message:", err.message);
            return res.status(500).json({
                success: false,
                message: "Could not save message."
            });
        }

        console.log("✅ Message saved! ID:", result.insertId);
        res.json({
            success: true,
            message: "Message sent!",
            id: result.insertId
        });
    });
});

// =====================================
// GET MESSAGES FOR USER
// =====================================
app.get("/api/messages/:user_id", (req, res) => {
    const { user_id } = req.params;

    const sql = `
        SELECT id, sender, message, status, created_at
        FROM messages
        WHERE user_id = ?
        ORDER BY created_at ASC
    `;

    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error("❌ Error getting messages:", err.message);
            return res.status(500).json({
                success: false,
                message: "Could not get messages."
            });
        }

        res.json({
            success: true,
            messages: results
        });
    });
});

// =====================================
// ADMIN LOGIN
// =====================================
app.post("/api/admin-login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.json({
            success: true,
            message: "Admin login successful."
        });
    }

    res.status(401).json({
        success: false,
        message: "Incorrect username or password."
    });
});

// =====================================
// GET ALL USERS (ADMIN)
// =====================================
app.get("/api/admin/users", (req, res) => {
    const sql = `
        SELECT id, full_name, email, phone, created_at
        FROM users
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error getting users:", err.message);
            return res.status(500).json({
                success: false,
                message: "Could not get users."
            });
        }

        res.json({
            success: true,
            users: results
        });
    });
});

// =====================================
// GET ALL MESSAGES (ADMIN)
// =====================================
app.get("/api/admin/messages", (req, res) => {
    const sql = `
        SELECT m.id, u.full_name, u.email, m.sender, m.message, m.status, m.created_at
        FROM messages m
        JOIN users u ON m.user_id = u.id
        ORDER BY m.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error getting messages:", err.message);
            return res.status(500).json({
                success: false,
                message: "Could not get messages."
            });
        }

        res.json({
            success: true,
            messages: results
        });
    });
});

// =====================================
// START SERVER
// =====================================
app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log(`🚀 Medicare Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📱 Medicare: http://localhost:${PORT}/index.html`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin-login.html`);
    console.log("=================================");
});