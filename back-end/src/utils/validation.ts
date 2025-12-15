// ==================== utils/validation.ts (UPDATED WITH SANITIZATION) ====================
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

// Helper to sanitize strings
const sanitizedString = (minLength: number = 1, maxLength: number = 255) =>
  z
    .string()
    .min(minLength)
    .max(maxLength)
    .transform((val) =>
      DOMPurify.sanitize(val, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      })
    );

// Shop schemas (UPDATED)
export const createShopSchema = z.object({
  name: sanitizedString(1, 255),
  facebook_page_id: z.string().optional().nullable(),
  instagram_page_id: z.string().optional().nullable(),
});

// Product schemas (UPDATED)
export const createProductSchema = z.object({
  shop_id: z.string().uuid(),
  name: sanitizedString(1, 255),
  description: sanitizedString(0, 5000).default(""),
  price: z.number().min(0),
  quantity_total: z.number().int().min(0).default(0),
  preorder_enabled: z.boolean().default(false),
  preorder_estimate_days: z.number().int().min(1).default(14),
  sku: sanitizedString(0, 100).optional().nullable(),
});

export const updateProductSchema = z.object({
  shop_id: z.string().uuid(),
  product_id: z.string().uuid(),
  name: sanitizedString(1, 255).optional(),
  description: sanitizedString(0, 5000).optional(),
  price: z.number().min(0).optional(),
  quantity_total: z.number().int().min(0).optional(),
  preorder_enabled: z.boolean().optional(),
  preorder_estimate_days: z.number().int().min(1).optional(),
  sku: sanitizedString(0, 100).optional().nullable(),
});

export const deleteProductSchema = z.object({
  shop_id: z.string().uuid(),
  product_id: z.string().uuid(),
});

// Reservation schemas
export const checkReservationSchema = z.object({
  shop_id: z.string().uuid(),
  product_id: z.string().uuid(),
  user_identifier: sanitizedString(1, 255),
  holdMinutes: z.number().int().min(1).max(60).default(10),
});

// Order schemas
export const confirmOrderSchema = z.object({
  reservation_id: z.string().uuid(),
  user_identifier: sanitizedString(1, 255),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(1000), // Max 1000 items per product
        price: z.number().min(0).max(1000000), // Max price validation
      })
    )
    .min(1)
    .max(50), // Max 50 items per order
});

// Customer schemas
export const addCustomerSchema = z.object({
  user_id: z.string().uuid(),
  shop_id: z.string().uuid(),
  role: z.enum([
    "owner",
    "manager",
    "shipper",
    "support",
    "inventory_staff",
    "finance",
    "admin",
  ]),
});

export const deleteCustomerSchema = z.object({
  user_id: z.string().uuid(),
  shop_id: z.string().uuid(),
});

// Subscription schemas
export const createSubscriptionSchema = z.object({
  shop_id: z.string().uuid(),
  channel: z.enum(["facebook", "instagram", "tiktok", "messenger", "website"]),
  plan_type: z.enum(["monthly", "6months", "yearly"]),
  expires_at: z.string().datetime(),
});

// Helper to validate request body
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
