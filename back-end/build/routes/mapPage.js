"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPageRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
exports.mapPageRouter = (0, express_1.Router)();
exports.mapPageRouter.post("/", async (req, res) => {
    try {
        const { page_id } = req.body;
        if (!page_id)
            return res.status(400).json({ error: "page_id required" });
        const { data: fb } = await supabase_1.supabaseAdmin
            .from("shops")
            .select("id,name")
            .eq("facebook_page_id", page_id)
            .limit(1);
        if (fb && fb.length)
            return res.json({ shop_id: fb[0].id, shop_name: fb[0].name });
        const { data: ig } = await supabase_1.supabaseAdmin
            .from("shops")
            .select("id,name")
            .eq("instagram_page_id", page_id)
            .limit(1);
        if (ig && ig.length)
            return res.json({ shop_id: ig[0].id, shop_name: ig[0].name });
        return res.status(404).json({ error: "Shop not found" });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=mapPage.js.map