import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { supabaseAdmin } from "./supabase";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export interface AuthPayload {
  user_id: string;
  role: string;
  shop_id?: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response
): Promise<AuthPayload | null> {
  const header = (req.headers.authorization || "") as string;
  const token = header.replace(/^Bearer\s+/, "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
  return decoded;
}

export async function assertShopOwner(
  decoded: AuthPayload,
  shop_id: string
): Promise<boolean> {
  if (decoded.role === "admin") return true;
  if (decoded.role === "owner" && decoded.shop_id === shop_id) return true;
  const { data, error } = await supabaseAdmin
    .from("shops")
    .select("owner_user_id")
    .eq("id", shop_id)
    .single();
  if (error || !data) return false;
  return data.owner_user_id === decoded.user_id;
}
