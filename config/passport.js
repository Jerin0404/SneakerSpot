const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
require("dotenv").config(); // Load environment variables

// Validate environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
    throw new Error("Missing Google OAuth environment variables. Please check your .env file.");
}

// Define Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
    scope: ["profile", "email"]
}, 
async (req, accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google OAuth Successful. Profile:", profile);

        if (!profile.emails || profile.emails.length === 0) {
            throw new Error("No email found in Google profile.");
        }

        // Check if user exists in the database
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            console.log("Existing user found:", user);
            return done(null, user);
        } else {
            // Create new user
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
            });

            await user.save();
            console.log("New user created:", user);
            return done(null, user);
        }
    } catch (err) {
        console.error("OAuth Error:", err);
        return done(err, null);
    }
}));

// Serialize User
passport.serializeUser((user, done) => {
    console.log("Serializing User:", user.id);
    done(null, user.id);
});

//Deserialize User
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        console.log("Deserializing User:", user);
        done(null, user);
    } catch (err) {
        console.error("Error in deserializeUser:", err);
        done(err, null);
    }
});

module.exports = passport;

