import { z } from 'zod';

export const PrintConfigurationSchema = z.object({
  paperSize: z.enum(['A4', 'A3', 'LEGAL', 'LETTER', 'PHOTO_4X6']),
  colorMode: z.enum(['BW', 'COLOR']),
  duplexMode: z.enum(['SINGLE', 'DOUBLE']),
  copies: z.number().int().min(1).max(500),
  pageRange: z.string().default('all'),
  orientation: z.enum(['AUTO', 'PORTRAIT', 'LANDSCAPE']).default('AUTO'),
  fitMode: z.enum(['FIT_PAGE', 'ACTUAL_SIZE']).default('FIT_PAGE'),
  paperType: z.enum(['NORMAL_75GSM', 'BOND_85GSM', 'GLOSSY_PHOTO', 'MATTE_PHOTO']).default('NORMAL_75GSM'),
  finishing: z.enum(['NONE', 'SPIRAL_BINDING', 'LAMINATION', 'STAPLING']).default('NONE')
});

export const OrderCreateSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  customerName: z.string().min(2, 'Customer name is required'),
  customerPhone: z.string().optional(),
  isGuest: z.boolean().default(true),
  paymentMethod: z.enum(['CASH', 'MANUAL_UPI', 'ONLINE_GATEWAY']),
  items: z.array(z.object({
    fileId: z.string().min(1),
    config: PrintConfigurationSchema
  })).min(1, 'At least one file item is required')
});
