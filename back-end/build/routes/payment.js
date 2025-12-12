"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRouter = void 0;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
exports.paymentRouter = (0, express_1.Router)();
async function simplePaymentMatcher({ payment_image_url, transaction_id, expected_amount, }) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, matchedAmount: expected_amount || null };
}
exports.paymentRouter.post("/verify", async (req, res) => {
    try {
        const { shop_id, user_id, payment_image_url, transaction_id, expected_amount, } = req.body;
        if (!shop_id || !user_id || !(payment_image_url || transaction_id))
            return res.status(400).json({ error: "Missing fields" });
        const verification = await simplePaymentMatcher({
            payment_image_url,
            transaction_id,
            expected_amount,
        });
        if (!verification.ok)
            return res.json({
                status: "failed",
                message: "Payment verification failed",
            });
        const { data: reservation } = await supabase_1.supabaseAdmin
            .from("reservations")
            .select("*")
            .eq("shop_id", shop_id)
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(1)
            .single();
        if (!reservation)
            return res.json({ status: "no-reservation" });
        await supabase_1.supabaseAdmin
            .from("reservations")
            .update({ status: "purchased" })
            .eq("id", reservation.id);
        if (reservation.order_type !== "preorder") {
            await supabase_1.supabaseAdmin.rpc("decrement_total", {
                p: JSON.stringify({ product_id: reservation.product_id }),
            });
        }
        const { data: order } = await supabase_1.supabaseAdmin
            .from("orders")
            .insert([
            {
                shop_id,
                reservation_id: reservation.id,
                user_id,
                total_amount: expected_amount || 0,
                status: "paid",
            },
        ])
            .select()
            .single();
        return res.json({
            status: "ok",
            reservation_id: reservation.id,
            order_id: order.id,
        });
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=payment.js.map