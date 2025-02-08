const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
require("dotenv").config(); // ✅ Fix: Ensure environment variables are loaded

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ["profile", "email"] // ✅ Fix: Ensure required scopes are included
},
async (accessToken, refreshToken, profile, done) => {
    try {
        console.log("Google Profile:", profile); // ✅ Debugging

        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        } else {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
            });
            await user.save();
            return done(null, user);
        }
    } catch (err) {
        console.error("OAuth Error:", err); // ✅ Debugging
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    console.log("Serializing User:", user); // ✅ Debugging
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            console.log("Deserializing User:", user); // ✅ Debugging
            done(null, user);
        })
        .catch(err => {
            console.error("Error in deserializeUser:", err);
            done(err, null);
        });
});

module.exports = passport;
