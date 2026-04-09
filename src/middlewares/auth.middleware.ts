import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { TokenPayload } from "../modules/auth/auth.service"

const JWT_SECRET = process.env.JWT_SECRET!

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization token" })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
