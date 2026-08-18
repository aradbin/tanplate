import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env', '.env.local'], override: true })

export default defineConfig({
  out: './src/lib/db/drizzle',
  schema: './src/lib/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
