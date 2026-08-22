import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'ag_studio',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD,
  max: 10,
})

// Auto-migration: ensure remainder_payment_type allows NULL for unpaid packages
pool.query('ALTER TABLE package ALTER COLUMN remainder_payment_type DROP NOT NULL').catch((err) => {
  console.error('Migration note:', err.message)
})

// Auto-migration: settings table double booking columns
pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS allow_double_booking BOOLEAN DEFAULT TRUE').catch(() => {})
pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS camera_count INTEGER DEFAULT 2').catch(() => {})

// Auto-migration: users table OTP columns for password reset
pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp TEXT').catch(() => {})
pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMPTZ').catch(() => {})

export async function nextId(table, prefix) {
  const pattern = `${prefix}-%`
  const { rows } = await pool.query(
    `SELECT id FROM ${table} WHERE id LIKE $1`,
    [pattern],
  )
  let max = 0
  for (const row of rows) {
    const suffix = row.id.slice(prefix.length + 1)
    if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}
