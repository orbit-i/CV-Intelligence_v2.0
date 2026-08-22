import { verifyToken } from "../utils/jwt.js";

/**
 * Protect a route by requiring a valid Bearer JWT in the
 * Authorization header.
 *
 * On success, attaches the decoded payload to req.user.
 * On failure, returns 401.
 */
export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or malformed"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    // Attach decoded payload so downstream handlers can use it
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

/**
 * Optional role guard — use after requireAuth.
 * e.g. requireRole("admin")
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions"
      });
    }
    next();
  };
};
