import { Router, Request, Response } from "express"
import { login } from "./auth.service"

const router = Router()

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" })
  }

  try {
    const token = await login(email, password)
    return res.json({ token })
  } catch {
    return res.status(401).json({ error: "Invalid credentials" })
  }
})

export default router
