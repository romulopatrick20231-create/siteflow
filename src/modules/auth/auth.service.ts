import jwt from "jsonwebtoken"
import { supabase } from "../../lib/supabase"
import bcrypt from "bcrypt"

const JWT_SECRET = process.env.JWT_SECRET!

export interface TokenPayload {
  user_id: string
  tenant_id: string
}

export async function login(email: string, password: string): Promise<string> {
  const { data: user, error } = await supabase
    .from("users")
    .select("id, tenant_id, password_hash")
    .eq("email", email)
    .single()

  if (error || !user) throw new Error("Invalid credentials")

  let valid = false
  if (user.password_hash.startsWith("$2")) {
    valid = await bcrypt.compare(password, user.password_hash)
  } else {
    valid = password === user.password_hash
  }

  if (!valid) throw new Error("Invalid credentials")

  const token = jwt.sign(
    { user_id: user.id, tenant_id: user.tenant_id } as TokenPayload,
    JWT_SECRET,
    { expiresIn: "7d" }
  )

  return token
}
