import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User';
import { config } from './config';

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        
        const user = await User.findOne({ email }).select('+password');
        
        
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        
        if (!user.isActive) {
          return done(null, false, { message: 'Account is deactivated. Please contact support.' });
        }
        
        
        const isPasswordMatch = await user.comparePassword(password);
        
        if (!isPasswordMatch) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      
      const user = await User.findById(jwtPayload.id);
      
      if (!user) {
        return done(null, false);
      }
      
      if (!user.isActive) {
        return done(null, false);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

export default passport; 
