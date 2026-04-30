import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const sqlClient = neon(process.env.DATABASE_URL!)
export const db = drizzle(sqlClient, { schema })
