import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase";

export const mapPageRouter = Router();

mapPageRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { page_id } = req.body;
    if (!page_id) return res.status(400).json({ error: "page_id required" });
    const { data: fb } = await supabaseAdmin
      .from("shops")
      .select("id,name")
      .eq("facebook_page_id", page_id)
      .limit(1);
    if (fb && fb.length)
      return res.json({ shop_id: fb[0].id, shop_name: fb[0].name });
    const { data: ig } = await supabaseAdmin
      .from("shops")
      .select("id,name")
      .eq("instagram_page_id", page_id)
      .limit(1);
    if (ig && ig.length)
      return res.json({ shop_id: ig[0].id, shop_name: ig[0].name });
    return res.status(404).json({ error: "Shop not found" });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
