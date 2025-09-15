import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Auth middleware debug logs
  // console.log('Auth middleware - URL:', req.url);
  // console.log('Auth middleware - AuthHeader:', authHeader ? 'exists' : 'missing');
  // console.log('Auth middleware - Token:', token ? 'exists' : 'missing');

  if (!token) {
    // console.log('Auth middleware - No token provided');
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // console.log('Auth middleware - Token decoded successfully for user:', decoded.id);
    
    const user = await storage.getUser(decoded.id);
    // console.log('Auth middleware - User found:', user ? user.username : 'none');
    
    if (!user) {
      // console.log('Auth middleware - User not found');
      return res.status(401).json({ message: "Invalid or inactive user" });
    }

    // Handle both possible field name formats (camelCase and snake_case)
    // Drizzle should map is_active -> isActive, but handle both just in case
    const isActive = user.isActive !== undefined ? user.isActive : (user as any).is_active;
    
    if (isActive === false || isActive === null || isActive === undefined) {
      // console.log('Auth middleware - User inactive');
      return res.status(401).json({ message: "Invalid or inactive user" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    
    // console.log('Auth middleware - Authentication successful');
    next();
  } catch (error) {
    // console.log('Auth middleware - Token verification failed:', error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log(`Auth role check - User role: "${req.user.role}", Allowed roles: [${allowedRoles.join(', ')}]`);
    
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`Auth role check - REJECTED: "${req.user.role}" not in allowed roles`);
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    console.log(`Auth role check - ALLOWED: "${req.user.role}" is in allowed roles`);
    next();
  };
};

export const generateToken = (user: { id: number; username: string; role: string }) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};