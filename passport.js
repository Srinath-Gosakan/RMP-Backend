import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Set up Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,  // Ensure this is correct
}, (accessToken, refreshToken, profile, done) => {
    // Check if the email domain is @sastra.ac.in
    const userEmail = profile.emails[0].value; // Get the user's email from Google

    if (userEmail.endsWith('@sastra.ac.in')) {
        // If email is valid, return the profile data (user)
        return done(null, profile);
    } else {
        // Reject the authentication if the email domain doesn't match
        return done(null, false, { message: 'Invalid email domain. Only @sastra.ac.in emails are allowed.' });
    }
}));

export default passport;
