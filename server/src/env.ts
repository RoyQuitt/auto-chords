import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
  APP_BASE_URL: z.string().url(),
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
  SESSION_SECRET: z.string().min(8),
  GOOGLE_CSE_API_KEY: z.string().min(1),
  GOOGLE_CSE_CX: z.string().min(1)
});

export const env = envSchema.parse(process.env);
