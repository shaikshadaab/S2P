import { z } from 'zod';

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default('demo-s2p-api-key'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default('s2p-shakeel.firebaseapp.com'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default('s2p-shakeel'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default('s2p-shakeel.appspot.com'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default('1234567890'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default('1:1234567890:web:abcdef123456'),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: z.string().optional().default('true'),
  NEXT_PUBLIC_PILOT_SHOP_NAME: z.string().default('Shakeel Online Services'),
  NEXT_PUBLIC_PILOT_SHOP_SLUG: z.string().default('shakeel-online-services'),
  NEXT_PUBLIC_PILOT_SHOP_UPI: z.string().default('shakeel.online@upi')
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function validateClientEnv(env: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(env);
  if (!result.success) {
    console.error('[S2P Environment Error] Invalid client environment configuration:', result.error.format());
    throw new Error('Invalid client environment configuration for S2P');
  }
  return result.data;
}
