import { z } from "zod";

export const phonePeConfigSchema = z.object({
  mode: z.enum(["platform", "direct"]),
  merchantId: z.string().min(1, "Merchant ID is required"),
  clientId: z.string().optional(),
  clientSecret: z.string().min(1, "Salt / Client Secret is required"),
  clientVersion: z.string().default("v1"),
  environment: z.enum(["sandbox", "production"]),
});

export const pricingRulesSchema = z.object({
  a4BwSingle: z.coerce.number().min(0.5, "A4 B&W single rate must be at least ₹0.50"),
  a4BwDouble: z.coerce.number().min(0.5, "A4 B&W double rate must be at least ₹0.50"),
  a4ColorSingle: z.coerce.number().min(1.0, "A4 Color single rate must be at least ₹1.00"),
  a4ColorDouble: z.coerce.number().min(1.0, "A4 Color double rate must be at least ₹1.00"),
  a3BwSingle: z.coerce.number().min(1.0, "A3 B&W rate must be at least ₹1.00"),
  a3ColorSingle: z.coerce.number().min(2.0, "A3 Color rate must be at least ₹2.00"),
  photoSingle: z.coerce.number().min(5.0, "Photo rate must be at least ₹5.00"),
  serviceFee: z.coerce.number().min(0, "Service fee cannot be negative"),
  minOrderAmount: z.coerce.number().min(1.0, "Minimum order amount must be at least ₹1.00"),
  taxPercentage: z.coerce.number().min(0).max(30, "Tax cannot exceed 30%"),
  discountPercentage: z.coerce.number().min(0).max(100, "Discount must be between 0% and 100%"),
  maxAllowedPages: z.coerce.number().min(1).max(1000, "Max allowed pages must be between 1 and 1000"),
});

export const printOptionsSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerMobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  customerWhatsapp: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian WhatsApp number")
    .optional()
    .or(z.literal("")),
  pageRangeText: z.string().default("all"),
  colorMode: z.enum(["bw", "color"]),
  paperSize: z.enum(["A4", "A3", "Photo"]),
  isDuplex: z.boolean().default(false),
  duplexMode: z.enum(["none", "long-edge", "short-edge"]).default("long-edge"),
  pagesPerSheet: z.coerce.number().refine((val) => [1, 2, 4].includes(val), {
    message: "Pages per sheet must be 1, 2, or 4",
  }),
  copies: z.coerce.number().min(1, "At least 1 copy required").max(100, "Max 100 copies"),
  fitToPage: z.boolean().default(true),
});

export const shopOnboardingSchema = z.object({
  fullName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number required"),
  shopName: z.string().min(3, "Shop name must be at least 3 characters"),
  businessCategory: z.string().min(2, "Category is required"),
  address: z.string().min(5, "Full address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pinCode: z.string().regex(/^\d{6}$/, "Must be a 6-digit PIN code"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only"),
  pricing: pricingRulesSchema,
  payment: phonePeConfigSchema.optional(),
});

export const pairingCodeSchema = z.object({
  code: z.string().length(6, "Pairing code must be exactly 6 characters").regex(/^\d{6}$/, "Must be 6 digits"),
  computerName: z.string().min(1, "Computer name is required"),
  osVersion: z.string().optional(),
  agentVersion: z.string().default("1.0.0"),
});
