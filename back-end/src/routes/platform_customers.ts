import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { requireUser } from "../lib/auth";

export const platformCustomersRouter = Router();

/**
 * POST /platform_customers/add
 * Body: { user_id (auth.users.id), shop_id, role }
 * This MUST be called by an admin (system admin) or by shop owner (owner can invite)
 */
platformCustomersRouter.post("/add", async (req: Request, res: Response) => {
  try {
    const caller = await requireUser(req, res);
    if (!caller) return;

    // Option: check caller is system admin or owner of target shop
    const { user_id, shop_id, role } = req.body;
    if (!user_id || !shop_id || !role)
      return res.status(400).json({ error: "Missing fields" });

    // upsert membership
    const { data, error } = await supabaseAdmin
      .from("platform_customers")
      .upsert([{ id: user_id, shop_id, role }])
      .select()
      .single();
    if (error) throw error;
    return res.json({ membership: data });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Unknown error");
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

/**
 * DELETE /platform_customers/delete
 * Body: { user_id, shop_id }
 */
platformCustomersRouter.delete(
  "/delete",
  async (req: Request, res: Response) => {
    try {
      const caller = await requireUser(req, res);
      if (!caller) return;

      const { user_id, shop_id } = req.body;
      if (!user_id || !shop_id)
        return res.status(400).json({ error: "Missing fields" });

      const { error } = await supabaseAdmin
        .from("platform_customers")
        .delete()
        .eq("id", user_id)
        .eq("shop_id", shop_id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }
);
