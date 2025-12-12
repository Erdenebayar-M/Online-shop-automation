import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth } from "../lib/auth";

export const customersRouter = Router();

customersRouter.post("/add", async (req: Request, res: Response) => {
  try {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Admin only" });
    const {
      name,
      email,
      role = "owner",
      shop_id = null,
      subscription_type = "monthly",
      subscription_expires_at = null,
    } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: "Missing fields" });
    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .insert([
        {
          name,
          email,
          role,
          shop_id,
          subscription_type,
          subscription_expire_at: subscription_expires_at,
        },
      ])
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, customer: data });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    res.status(500).json({ error: error.message });
  }
});

customersRouter.delete("/delete", async (req: Request, res: Response) => {
  try {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Admin only" });
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ error: "Missing fields" });
    const { error } = await supabaseAdmin
      .from("platform_customers")
      .delete()
      .eq("id", customer_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    res.status(500).json({ error: error.message });
  }
});
