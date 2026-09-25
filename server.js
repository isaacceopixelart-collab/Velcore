const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();

app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

app.get("/", (req, res) => {
    res.send("Google Auth Backend is running!");
});

app.get("/google/login", (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        prompt: "consent"
    });

    res.redirect(authUrl);
});

app.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send("No authorization code received.");
        }

        const { tokens } = await oauth2Client.getToken(code);

        if (tokens.refresh_token) {
            fs.writeFileSync(
                "google-refresh-token.txt",
                tokens.refresh_token
            );
        }

        console.log("Google login successful.");
        console.log("Refresh token saved.");

        res.send("Google login successful. Refresh token saved.");

    } catch (error) {
        console.error("GOOGLE LOGIN ERROR:");
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data || error.message
        });
    }
});

app.get("/google/refresh", async (req, res) => {
    try {
        const refreshToken = fs.readFileSync(
            "google-refresh-token.txt",
            "utf8"
        ).trim();

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const { credentials } =
            await oauth2Client.refreshAccessToken();

        console.log("Google token refreshed successfully.");

        res.json({
            access_token: credentials.access_token,
            expires_in: credentials.expiry_date
                ? Math.floor(
                    (credentials.expiry_date - Date.now()) / 1000
                )
                : null
        });

    } catch (error) {
        console.error("REFRESH ERROR:");
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data || error.message
        });
    }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
