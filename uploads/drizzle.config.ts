import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './shared',
  dbCredentials: { url: process.env.DATABASE_URL! },

 
});
