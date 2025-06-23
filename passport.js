import googleStrategy from 'passport-google-oauth20';
import passport from 'passport';

passport.use(new googleStrategy.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL || 'http://localhost:8080'}/api/auth/google/callback`,
    scope  : ['profile', 'email'],
},
function (accessToken, refreshToken, profile, done) {
    const email = profile.emails?.[0]?.value;

    if (email && email.endsWith('@sastra.ac.in')) {
        return done(null, profile);
    } else {
        return done(null, false, { message: 'Only @sastra.ac.in emails are allowed.' });
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});