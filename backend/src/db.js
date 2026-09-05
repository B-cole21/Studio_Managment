import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcrypt'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL
const isRemote = Boolean(connectionString || (process.env.PGHOST && process.env.PGHOST !== 'localhost'))

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
      }
    : {
        host: process.env.PGHOST ?? 'localhost',
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? 'ag_studio',
        user: process.env.PGUSER ?? 'postgres',
        password: process.env.PGPASSWORD,
        ssl: isRemote ? { rejectUnauthorized: false } : false,
        max: 10,
      },
)

// Auto-migration: ensure remainder_payment_type allows NULL for unpaid packages
pool.query('ALTER TABLE package ALTER COLUMN remainder_payment_type DROP NOT NULL').catch((err) => {
  console.error('Migration note:', err.message)
})

// Auto-migration: ensure second_payment_type exists on package
pool.query("ALTER TABLE package ADD COLUMN IF NOT EXISTS second_payment_type TEXT DEFAULT 'Cash'").catch((err) => {
  console.error('Migration note:', err.message)
})

// Auto-migration: settings table double booking columns
pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS allow_double_booking BOOLEAN DEFAULT TRUE').catch(() => {})
pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS camera_count INTEGER DEFAULT 2').catch(() => {})


// Auto-migration & Performance Indexes
pool.query('CREATE INDEX IF NOT EXISTS idx_booking_date ON booking (date)').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_package_date ON package (date DESC)').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_package_created_at ON package (created_at DESC)').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_users_user_name ON users (user_name)').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_users_lower_user_name ON users (LOWER(user_name))').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_package_phone_date ON package (phone, date)').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_package_lower_name ON package (LOWER(TRIM(name)))').catch(() => {})
pool.query('CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire)').catch(() => {})


// Auto-migration: hash existing plaintext passwords to bcrypt
async function migratePasswordsToBcrypt() {
  try {
    const { rows } = await pool.query('SELECT id, password FROM users')
    for (const u of rows) {
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$') && !u.password.startsWith('$2y$')) {
        const hash = await bcrypt.hash(u.password.trim(), 10)
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, u.id])
        console.log(`Migrated user ID ${u.id} password to bcrypt hash.`)
      }
    }
  } catch (err) {
    console.error('Password bcrypt migration note:', err.message)
  }
}
migratePasswordsToBcrypt()

export async function nextId(table, prefix) {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM length($1) + 2) AS INTEGER)), 0) AS max_num
       FROM ${table}
       WHERE id ~ ('^' || $1 || '-[0-9]+$')`,
      [prefix],
    )
    const max = Number(rows[0]?.max_num || 0)
    return `${prefix}-${String(max + 1).padStart(3, '0')}`
  } catch {
    const { rows } = await pool.query(
      `SELECT id FROM ${table} WHERE id LIKE $1 ORDER BY LENGTH(id) DESC, id DESC LIMIT 50`,
      [`${prefix}-%`],
    )
    let max = 0
    for (const row of rows) {
      const suffix = row.id.slice(prefix.length + 1)
      if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix))
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`
  }
}
