const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

// Root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Test API
app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "API is working!" });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("=================================");
});