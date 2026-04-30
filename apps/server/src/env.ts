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
  BRAVE_SEARCH_API_KEY: z.string().min(1),
  BRAVE_SEARCH_ENDPOINT: z.string().url().default("https://api.search.brave.com/res/v1/web/search")
});

export const env = envSchema.parse(process.env);
