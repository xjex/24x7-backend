import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: Error, user: IUser) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
      return;
    }
    
    
    (req as AuthRequest).user = user;
    next();
  })(req, res, next);
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
      return;
    }
    
    if (!roles.includes(authReq.user.role)) {
      res.status(403).json({
        success: false,
        error: `User role ${authReq.user.role} is not authorized to access this route`
      });
      return;
    }
    
    next();
  };
}; 
