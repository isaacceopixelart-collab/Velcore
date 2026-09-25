const express = require("express");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();

app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Test
app.get("/", (req, res) => {
    res.send("Google Auth Backend is running!");
});

// Initial Google authorization
app.get("/google/login", (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        prompt: "consent"
    });

    res.redirect(authUrl);
});

// OAuth callback
app.get("/google/callback", async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send(
                "No authorization code received."
            );
        }

        const { tokens } = await oauth2Client.getToken(code);

        console.log("Google authorization successful.");

        console.log(
            "Refresh token received:",
            !!tokens.refresh_token
        );

        console.log(
            "ID token received:",
            !!tokens.id_token
        );

        res.send(
            "Google authorization successful. Refresh token is configured in Render."
        );

    } catch (error) {
        console.error("GOOGLE LOGIN ERROR:");
        console.error(error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data || error.message
        });
    }
});

// Get fresh Google tokens
app.get("/google/refresh", async (req, res) => {
    try {
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!refreshToken) {
            return res.status(500).json({
                error: "GOOGLE_REFRESH_TOKEN is not configured."
            });
        }

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const { credentials } =
            await oauth2Client.refreshAccessToken();

        console.log("Google token refreshed successfully.");

        res.json({
            id_token: credentials.id_token || null,
            access_token: credentials.access_token || null,
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
