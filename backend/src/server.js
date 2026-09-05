import dns from 'node:dns'
import express from 'express'

dns.setDefaultResultOrder('ipv4first')
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import nodemailer from 'nodemailer'
import bcrypt from 'bcrypt'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { existsSync, readFileSync } from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, nextId } from './db.js'

const app = express()
app.set('trust proxy', 1)

// HTTP Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

// Rate Limiting for Authentication Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
})

app.use('/api/auth/login', authLimiter)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

app.use(express.json())

const PgSession = connectPgSimple(session)
const isProductionSecure = process.env.SESSION_SECURE === 'true' || process.env.NODE_ENV === 'production'

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 60,
    }),
    name: 'studio.sid',
    secret: process.env.SESSION_SECRET ?? 'studio-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProductionSecure ? 'none' : 'lax',
      secure: isProductionSecure ? true : 'auto',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
)

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: err.message })
  }
})

app.get('/api/services', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, duration_min AS "durationMin", is_birthday AS "isBirthday"
       FROM service ORDER BY name`,
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.post('/api/services', async (req, res, next) => {
  try {
    const { name, durationMin, isBirthday } = req.body
    if (!name || !durationMin) {
      return res.status(400).json({ error: 'name and durationMin are required' })
    }
    const id = await nextId('service', 'svc')
    const { rows } = await pool.query(
      `INSERT INTO service (id, name, duration_min, is_birthday)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, duration_min AS "durationMin", is_birthday AS "isBirthday"`,
      [id, name, durationMin, isBirthday ?? false],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.put('/api/services/:id', async (req, res, next) => {
  try {
    const { name, durationMin, isBirthday } = req.body
    const { rows } = await pool.query(
      `UPDATE service
       SET name = COALESCE($2, name),
           duration_min = COALESCE($3, duration_min),
           is_birthday = COALESCE($4, is_birthday)
       WHERE id = $1
       RETURNING id, name, duration_min AS "durationMin", is_birthday AS "isBirthday"`,
      [req.params.id, name, durationMin, isBirthday],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Service not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.delete('/api/services/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM service WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service not found' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

function validateEthiopianPhone(phone) {
  if (!phone) return null
  let digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('251') && digits.length === 12) {
    digits = '0' + digits.slice(3)
  }
  if (!/^(09|07)\d{8}$/.test(digits)) {
    return null
  }
  return digits
}

app.get('/api/booking', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, event, date::text AS "date", time, phone, age
       FROM booking ORDER BY date, time`,
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.post('/api/booking', async (req, res, next) => {
  try {
    const { event, date, time, phone, age } = req.body
    if (!event || !date || !time || !phone) {
      return res.status(400).json({ error: 'event, date, time and phone are required' })
    }
    const cleanPhone = validateEthiopianPhone(phone)
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Phone number must start with 09 or 07 followed by 8 digits (10 digits total)' })
    }
    const { rows } = await pool.query(
      `INSERT INTO booking (event, date, time, phone, age)
       VALUES ($1, $2::date, $3, $4, $5)
       RETURNING id, event, date::text AS "date", time, phone, age`,
      [event, date, time, cleanPhone, age ?? null],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.put('/api/booking/:id', async (req, res, next) => {
  try {
    const { event, date, time, phone, age } = req.body
    let cleanPhone = undefined
    if (phone !== undefined) {
      cleanPhone = validateEthiopianPhone(phone)
      if (!cleanPhone) {
        return res.status(400).json({ error: 'Phone number must start with 09 or 07 followed by 8 digits (10 digits total)' })
      }
    }
    const { rows } = await pool.query(
      `UPDATE booking
       SET event = COALESCE($2, event),
           date = COALESCE($3::date, date),
           time = COALESCE($4, time),
           phone = COALESCE($5, phone),
           age = COALESCE($6, age)
       WHERE id = $1
       RETURNING id, event, date::text AS "date", time, phone, age`,
      [req.params.id, event, date, time, cleanPhone, age],
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Booking not found' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.delete('/api/booking/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM booking WHERE id = $1', [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Booking not found' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

const packageSelect = `
  SELECT id, name, phone, quantity, frame, first_payment AS "firstPayment",
         second_payment AS "secondPayment",
         remainder, date::text AS "date", payment_type AS "paymentType",
         full_payment AS "fullPayment",
         first_confirmed AS "firstConfirmed", first_confirmed_by AS "firstConfirmedBy",
         first_confirmed_at AS "firstConfirmedAt",
         first_cashier_confirmed AS "firstCashierConfirmed",
         first_cashier_confirmed_by AS "firstCashierConfirmedBy",
         first_cashier_confirmed_at AS "firstCashierConfirmedAt",
         remainder_received AS "remainderReceived",
         remainder_received_at AS "remainderReceivedAt",
         remainder_confirmed AS "remainderConfirmed",
         remainder_confirmed_by AS "remainderConfirmedBy",
         remainder_confirmed_at AS "remainderConfirmedAt",
         remainder_cashier_confirmed AS "remainderCashierConfirmed",
         remainder_cashier_confirmed_by AS "remainderCashierConfirmedBy",
         remainder_cashier_confirmed_at AS "remainderCashierConfirmedAt",
         second_payment_confirmed AS "secondPaymentConfirmed",
         second_payment_confirmed_by AS "secondPaymentConfirmedBy",
         second_payment_confirmed_at AS "secondPaymentConfirmedAt",
         second_payment_cashier_confirmed AS "secondPaymentCashierConfirmed",
         second_payment_cashier_confirmed_by AS "secondPaymentCashierConfirmedBy",
         second_payment_cashier_confirmed_at AS "secondPaymentCashierConfirmedAt",
         created_by AS "createdBy", created_by_name AS "createdByName",
         pending_selection AS "pendingSelection",
         second_payment_type AS "secondPaymentType",
         remainder_payment_type AS "remainderPaymentType"
  FROM package`

const packageReturning = `
  RETURNING id, name, phone, quantity, frame, first_payment AS "firstPayment",
            second_payment AS "secondPayment",
            remainder, date::text AS "date", payment_type AS "paymentType",
            full_payment AS "fullPayment",
            first_confirmed AS "firstConfirmed", first_confirmed_by AS "firstConfirmedBy",
            first_confirmed_at AS "firstConfirmedAt",
            first_cashier_confirmed AS "firstCashierConfirmed",
            first_cashier_confirmed_by AS "firstCashierConfirmedBy",
            first_cashier_confirmed_at AS "firstCashierConfirmedAt",
            remainder_received AS "remainderReceived",
            remainder_received_at AS "remainderReceivedAt",
            remainder_confirmed AS "remainderConfirmed",
            remainder_confirmed_by AS "remainderConfirmedBy",
            remainder_confirmed_at AS "remainderConfirmedAt",
            remainder_cashier_confirmed AS "remainderCashierConfirmed",
            remainder_cashier_confirmed_by AS "remainderCashierConfirmedBy",
            remainder_cashier_confirmed_at AS "remainderCashierConfirmedAt",
            second_payment_confirmed AS "secondPaymentConfirmed",
            second_payment_confirmed_by AS "secondPaymentConfirmedBy",
            second_payment_confirmed_at AS "secondPaymentConfirmedAt",
            second_payment_cashier_confirmed AS "secondPaymentCashierConfirmed",
            second_payment_cashier_confirmed_by AS "secondPaymentCashierConfirmedBy",
            second_payment_cashier_confirmed_at AS "secondPaymentCashierConfirmedAt",
            created_by AS "createdBy", created_by_name AS "createdByName",
            pending_selection AS "pendingSelection",
            second_payment_type AS "secondPaymentType",
            remainder_payment_type AS "remainderPaymentType"`

function requireRole(roles) {
  return (req, res, next) => {
    const role = req.session.user?.role
    if (!role) return res.status(401).json({ error: 'Not signed in' })
    if (!roles.includes(role)) return res.status(403).json({ error: 'You do not have permission to do this' })
    next()
  }
}

app.get('/api/package', requireRole(['cashier', 'owner', 'cameraman']), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`${packageSelect} ORDER BY date DESC, created_at DESC`)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.post('/api/package', requireRole(['cashier', 'cameraman', 'owner']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { name, phone, quantity, frame, firstPayment, secondPayment, remainder, date, fullPayment, paymentType, pendingSelection, remainderPaymentType, secondPaymentType } = req.body
    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' })
    }
    const cleanPhone = validateEthiopianPhone(phone)
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Phone number must start with 09 or 07 followed by 8 digits (10 digits total)' })
    }

    const { rows: dupRows } = await pool.query(
      `SELECT id FROM package
       WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND phone = $2 AND (date = $3::date OR ($3::date IS NULL AND date IS NULL))`,
      [name.trim(), cleanPhone, date ?? null],
    )
    if (dupRows.length > 0) {
      return res.status(409).json({ error: `Data is already present! Package for "${name.trim()}" with phone ${cleanPhone} already exists.` })
    }
    const isPending = Boolean(pendingSelection)
    const isCashier = me.role === 'cashier'
    const qty = isPending ? null : (quantity ?? 1)
    if (!isPending && (qty == null || qty <= 0)) {
      return res.status(400).json({ error: 'quantity is required for complete packages' })
    }
    const first = Number(firstPayment ?? 0)
    const second = Number(secondPayment ?? 0)
    const rest = isPending ? 0 : (fullPayment ? 0 : Number(remainder ?? 0))
    const full = Boolean(fullPayment)
    const type = ['Cash', 'Bank', 'Telebirr'].includes(paymentType) ? paymentType : 'Cash'
    const secType = ['Cash', 'Bank', 'Telebirr'].includes(secondPaymentType) ? secondPaymentType : 'Cash'
    const rType = ['Cash', 'Bank', 'Telebirr'].includes(remainderPaymentType) ? remainderPaymentType : null
    if (first < 0 || second < 0 || (rest != null && rest < 0)) return res.status(400).json({ error: 'Payments cannot be negative' })
    const id = await nextId('package', 'pkg')
    const firstCashierConfirmed = isCashier && type === 'Cash'
    const { rows } = await pool.query(
      `INSERT INTO package (id, name, phone, quantity, frame, first_payment, second_payment, remainder, date, payment_type, full_payment,
                            created_by, created_by_name, pending_selection,
                            first_cashier_confirmed, first_cashier_confirmed_by, first_cashier_confirmed_at,
                            second_payment_type, remainder_payment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ${packageReturning}`,
      [id, name, cleanPhone, qty, frame ?? null, first, second, rest, date ?? null, type, full, me.id, me.userName, isPending,
       firstCashierConfirmed, firstCashierConfirmed ? me.id : null, firstCashierConfirmed ? new Date() : null, secType, rType],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.put('/api/package/:id', requireRole(['cashier', 'owner', 'cameraman']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { name, phone, firstPayment, secondPayment, remainder, remainderReceived, quantity, frame, date, paymentType, fullPayment, pendingSelection, secondPaymentType, remainderPaymentType } = req.body
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })

    const updateFields = {}

    if (name !== undefined && name.trim()) {
      updateFields.name = name.trim()
    }

    if (phone !== undefined) {
      const cleanPhone = validateEthiopianPhone(phone)
      if (!cleanPhone) {
        return res.status(400).json({ error: 'Phone number must start with 09 or 07 followed by 8 digits (10 digits total)' })
      }
      updateFields.phone = cleanPhone
    }

    if (pendingSelection !== undefined) {
      const isPending = Boolean(pendingSelection)
      updateFields.pending_selection = isPending
      if (!isPending && pkg.pendingSelection && me.role !== 'owner') {
        updateFields.first_confirmed = false
        updateFields.first_confirmed_by = null
        updateFields.first_confirmed_at = null
        updateFields.second_payment_confirmed = false
        updateFields.second_payment_confirmed_by = null
        updateFields.second_payment_confirmed_at = null
        updateFields.remainder_confirmed = false
        updateFields.remainder_confirmed_by = null
        updateFields.remainder_confirmed_at = null
        const effFirstType = paymentType || pkg.paymentType
        if (me.role === 'cashier' && effFirstType === 'Cash') {
          updateFields.first_cashier_confirmed = true
          updateFields.first_cashier_confirmed_by = me.id
          updateFields.first_cashier_confirmed_at = new Date()
        } else {
          updateFields.first_cashier_confirmed = false
          updateFields.first_cashier_confirmed_by = null
          updateFields.first_cashier_confirmed_at = null
        }
      }
    }

    if (quantity !== undefined) {
      const qty = Number(quantity)
      if (!pkg.pendingSelection && pkg.firstConfirmed && me.role !== 'owner' && me.role !== 'cashier' && qty !== Number(pkg.quantity)) {
        return res.status(400).json({ error: 'Package is confirmed and locked' })
      }
      if (qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' })
      updateFields.quantity = qty
    }

    if (frame !== undefined) {
      updateFields.frame = frame ? frame.trim() : null
    }

    if (date !== undefined) {
      updateFields.date = date || null
    }

    if (paymentType !== undefined && paymentType != null) {
      updateFields.payment_type = ['Cash', 'Bank', 'Telebirr'].includes(paymentType) ? paymentType : 'Cash'
      if (updateFields.payment_type !== 'Cash') {
        updateFields.first_cashier_confirmed = false
        updateFields.first_cashier_confirmed_by = null
        updateFields.first_cashier_confirmed_at = null
      }
    }

    if (fullPayment !== undefined) {
      const isFull = Boolean(fullPayment)
      updateFields.full_payment = isFull
      if (isFull) {
        updateFields.remainder = 0
      }
    }

    if (firstPayment !== undefined) {
      const first = Number(firstPayment)
      const isCompleting = pendingSelection === false && pkg.pendingSelection
      if (pkg.firstConfirmed && !isCompleting && me.role !== 'owner' && me.role !== 'cashier' && first !== Number(pkg.firstPayment)) {
        return res.status(400).json({ error: 'First payment is confirmed and locked' })
      }
      if (!pkg.pendingSelection && !isCompleting && me.role !== 'owner' && me.role !== 'cashier' && first !== Number(pkg.firstPayment)) {
        return res.status(403).json({ error: 'Only the cashier or owner can change the first payment' })
      }
      if (first < 0) return res.status(400).json({ error: 'Payments cannot be negative' })
      updateFields.first_payment = first
      if (first !== Number(pkg.firstPayment)) {
        if (me.role !== 'owner' && pkg.firstCashierConfirmed) {
          updateFields.first_cashier_confirmed = false
          updateFields.first_cashier_confirmed_by = null
          updateFields.first_cashier_confirmed_at = null
        }
        if (pkg.firstConfirmed) {
          updateFields.first_confirmed = false
          updateFields.first_confirmed_by = null
          updateFields.first_confirmed_at = null
        }
      }
    }

    if (secondPayment !== undefined) {
      const second = Number(secondPayment)
      if (second < 0) return res.status(400).json({ error: 'Payments cannot be negative' })
      updateFields.second_payment = second
      const secType = secondPaymentType !== undefined
        ? (['Cash', 'Bank', 'Telebirr'].includes(secondPaymentType) ? secondPaymentType : 'Cash')
        : (pkg.secondPaymentType || updateFields.payment_type || pkg.paymentType)
      if (second !== Number(pkg.secondPayment)) {
        if (me.role === 'cashier' && second > 0 && secType === 'Cash') {
          updateFields.second_payment_cashier_confirmed = true
          updateFields.second_payment_cashier_confirmed_by = me.id
          updateFields.second_payment_cashier_confirmed_at = new Date()
        } else {
          updateFields.second_payment_cashier_confirmed = false
          updateFields.second_payment_cashier_confirmed_by = null
          updateFields.second_payment_cashier_confirmed_at = null
        }
        if (pkg.secondPaymentConfirmed) {
          updateFields.second_payment_confirmed = false
          updateFields.second_payment_confirmed_by = null
          updateFields.second_payment_confirmed_at = null
        }
      }
    }

    if (remainder !== undefined) {
      const rest = Number(remainder)
      if (pkg.fullPayment && !fullPayment) return res.status(400).json({ error: 'Full payment package cannot have a remainder' })
      if (pkg.remainderConfirmed && me.role !== 'owner' && me.role !== 'cashier' && rest !== Number(pkg.remainder)) {
        return res.status(400).json({ error: 'Remainder is confirmed and locked' })
      }
      if (rest < 0) return res.status(400).json({ error: 'Payments cannot be negative' })
      if (!updateFields.full_payment) {
        updateFields.remainder = rest
      }
      if (rest !== Number(pkg.remainder) && me.role !== 'owner' && pkg.remainderConfirmed) {
        updateFields.remainder_confirmed = false
        updateFields.remainder_confirmed_by = null
        updateFields.remainder_confirmed_at = null
      }
    }

    if (remainderReceived !== undefined) {
      const isReceived = Boolean(remainderReceived)
      updateFields.remainder_received = isReceived
      updateFields.remainder_received_at = isReceived ? new Date() : null
      const remType = remainderPaymentType !== undefined
        ? (['Cash', 'Bank', 'Telebirr'].includes(remainderPaymentType) ? remainderPaymentType : null)
        : (pkg.remainderPaymentType || updateFields.payment_type || pkg.paymentType)
      if (isReceived !== pkg.remainderReceived) {
        if (me.role !== 'owner') {
          updateFields.remainder_confirmed = false
          updateFields.remainder_confirmed_by = null
          updateFields.remainder_confirmed_at = null
        }
        if (isReceived && me.role === 'cashier' && remType === 'Cash') {
          updateFields.remainder_cashier_confirmed = true
          updateFields.remainder_cashier_confirmed_by = me.id
          updateFields.remainder_cashier_confirmed_at = new Date()
        } else {
          updateFields.remainder_cashier_confirmed = false
          updateFields.remainder_cashier_confirmed_by = null
          updateFields.remainder_cashier_confirmed_at = null
        }
      }
    }

    if (secondPaymentType !== undefined && secondPaymentType != null) {
      updateFields.second_payment_type = ['Cash', 'Bank', 'Telebirr'].includes(secondPaymentType) ? secondPaymentType : 'Cash'
      if (updateFields.second_payment_type !== 'Cash') {
        updateFields.second_payment_cashier_confirmed = false
        updateFields.second_payment_cashier_confirmed_by = null
        updateFields.second_payment_cashier_confirmed_at = null
      }
    }

    if (remainderPaymentType !== undefined) {
      updateFields.remainder_payment_type = ['Cash', 'Bank', 'Telebirr'].includes(remainderPaymentType) ? remainderPaymentType : null
      if (updateFields.remainder_payment_type && updateFields.remainder_payment_type !== 'Cash') {
        updateFields.remainder_cashier_confirmed = false
        updateFields.remainder_cashier_confirmed_by = null
        updateFields.remainder_cashier_confirmed_at = null
      }
    }

    const entries = Object.entries(updateFields)
    if (entries.length === 0) return res.json(pkg)

    const setClauses = entries.map(([col], idx) => `${col} = $${idx + 2}`)
    const values = entries.map(([, val]) => val)

    const sql = `UPDATE package SET ${setClauses.join(', ')} WHERE id = $1 ${packageReturning}`
    const { rows: updated } = await pool.query(sql, [req.params.id, ...values])
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/package/:id/cashier-confirm-first', requireRole(['cashier']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    if (pkg.paymentType !== 'Cash') return res.status(400).json({ error: 'Only cash payments require cashier confirmation' })
    if (pkg.firstCashierConfirmed) return res.status(400).json({ error: 'First payment already cashier-confirmed' })
    if (pkg.firstConfirmed) return res.status(400).json({ error: 'First payment already confirmed by owner' })
    const { rows: updated } = await pool.query(
      `UPDATE package
       SET first_cashier_confirmed = TRUE, first_cashier_confirmed_by = $2, first_cashier_confirmed_at = NOW()
       WHERE id = $1 ${packageReturning}`,
      [req.params.id, me.id],
    )
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/package/:id/confirm-first', requireRole(['owner']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    if (pkg.firstConfirmed) return res.status(400).json({ error: 'First payment already confirmed' })
    if (pkg.paymentType === 'Cash' && !pkg.firstCashierConfirmed) return res.status(400).json({ error: 'Cashier has not confirmed the first payment yet' })
    const { rows: updated } = await pool.query(
      `UPDATE package
       SET first_confirmed = TRUE, first_confirmed_by = $2, first_confirmed_at = NOW()
       WHERE id = $1 ${packageReturning}`,
      [req.params.id, me.id],
    )
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/package/:id/cashier-confirm-remainder', requireRole(['cashier']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    const effectiveRemainderType = pkg.remainderPaymentType || pkg.paymentType
    if (effectiveRemainderType !== 'Cash') return res.status(400).json({ error: 'Only cash payments require cashier confirmation' })
    if (pkg.remainderCashierConfirmed) return res.status(400).json({ error: 'Remainder already cashier-confirmed' })
    if (pkg.remainderConfirmed) return res.status(400).json({ error: 'Remainder already confirmed by owner' })
    if (!pkg.remainderReceived) return res.status(400).json({ error: 'Remainder payment has not been recorded yet' })
    const { rows: updated } = await pool.query(
      `UPDATE package
       SET remainder_cashier_confirmed = TRUE, remainder_cashier_confirmed_by = $2, remainder_cashier_confirmed_at = NOW()
       WHERE id = $1 ${packageReturning}`,
      [req.params.id, me.id],
    )
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/package/:id/confirm-remainder', requireRole(['owner']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    if (pkg.fullPayment) return res.status(400).json({ error: 'This is a full payment package' })
    if (pkg.remainderConfirmed) return res.status(400).json({ error: 'Remainder already confirmed' })
    if (!pkg.remainderReceived) return res.status(400).json({ error: 'The remainder payment has not been recorded yet' })
    const effectiveRemainderType = pkg.remainderPaymentType || pkg.paymentType
    if (effectiveRemainderType === 'Cash' && !pkg.remainderCashierConfirmed) return res.status(400).json({ error: 'Cashier has not confirmed the remainder payment yet' })
    const { rows: updated } = await pool.query(
      `UPDATE package
       SET remainder_confirmed = TRUE, remainder_confirmed_by = $2, remainder_confirmed_at = NOW()
       WHERE id = $1 ${packageReturning}`,
      [req.params.id, me.id],
    )
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/package/:id/cashier-confirm-second', requireRole(['cashier']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    const effectiveSecondType = pkg.secondPaymentType || pkg.paymentType
    if (effectiveSecondType !== 'Cash') return res.status(400).json({ error: 'Only cash payments require cashier confirmation' })
    if (pkg.secondPayment <= 0) return res.status(400).json({ error: 'No second payment on this package' })
    if (pkg.secondPaymentCashierConfirmed) return res.status(400).json({ error: 'Second payment already cashier-confirmed' })
    if (pkg.secondPaymentConfirmed) return res.status(400).json({ error: 'Second payment already confirmed by owner' })
    const { rows: updated } = await pool.query(
      `UPDATE package
       SET second_payment_cashier_confirmed = TRUE, second_payment_cashier_confirmed_by = $2, second_payment_cashier_confirmed_at = NOW()
       WHERE id = $1 ${packageReturning}`,
      [req.params.id, me.id],
    )
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/package/:id/confirm-second', requireRole(['owner']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    if (pkg.secondPayment <= 0) return res.status(400).json({ error: 'No second payment on this package' })
    if (pkg.secondPaymentConfirmed) return res.status(400).json({ error: 'Second payment already confirmed' })
    const effectiveSecondType = pkg.secondPaymentType || pkg.paymentType
    if (effectiveSecondType === 'Cash' && !pkg.secondPaymentCashierConfirmed) return res.status(400).json({ error: 'Cashier has not confirmed the second payment yet' })
    const { rows: updated } = await pool.query(
      `UPDATE package
       SET second_payment_confirmed = TRUE, second_payment_confirmed_by = $2, second_payment_confirmed_at = NOW()
       WHERE id = $1 ${packageReturning}`,
      [req.params.id, me.id],
    )
    res.json(updated[0])
  } catch (err) {
    next(err)
  }
})

app.get('/api/settings', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT studio_name AS "studioName", phone, address, hours, backup_at AS "backupAt",
              COALESCE(allow_double_booking, true) AS "allowDoubleBooking",
              COALESCE(camera_count, 2) AS "cameraCount"
       FROM settings WHERE id = 1`,
    )
    if (rows.length === 0) {
      return res.status(200).json({
        studioName: 'AG Studio',
        phone: '',
        address: '',
        hours: [],
        backupAt: 'Today 03:00',
        allowDoubleBooking: true,
        cameraCount: 2,
      })
    }
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.put('/api/settings', async (req, res, next) => {
  try {
    const { studioName, phone, address, hours, backupAt, allowDoubleBooking, cameraCount } = req.body
    const hoursJson = hours !== undefined ? (typeof hours === 'string' ? hours : JSON.stringify(hours)) : null
    const { rows } = await pool.query(
      `INSERT INTO settings (id, studio_name, phone, address, hours, backup_at, allow_double_booking, camera_count)
       VALUES (1, $1, $2, $3, $4::jsonb, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         studio_name = COALESCE($1, settings.studio_name),
         phone = COALESCE($2, settings.phone),
         address = COALESCE($3, settings.address),
         hours = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE settings.hours END,
         backup_at = COALESCE($5, settings.backup_at),
         allow_double_booking = COALESCE($6, settings.allow_double_booking),
         camera_count = COALESCE($7, settings.camera_count)
       RETURNING studio_name AS "studioName", phone, address, hours, backup_at AS "backupAt",
                 allow_double_booking AS "allowDoubleBooking", camera_count AS "cameraCount"`,
      [
        studioName !== undefined ? studioName : null,
        phone !== undefined ? phone : null,
        address !== undefined ? address : null,
        hoursJson,
        backupAt !== undefined ? backupAt : null,
        allowDoubleBooking !== undefined ? allowDoubleBooking : null,
        cameraCount !== undefined ? cameraCount : null,
      ],
    )
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { userName, password } = req.body
    if (!userName || !password) {
      return res.status(400).json({ error: 'userName and password are required' })
    }
    const { rows } = await pool.query(
      `SELECT id, user_name AS "userName", email, role, password
       FROM users WHERE LOWER(user_name) = LOWER($1) LIMIT 1`,
      [userName.trim()],
    )
    const user = rows[0]
    const valid = user && (await bcrypt.compare(password, user.password).catch(() => false))
    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }
    const { password: _hidden, ...safe } = user
    req.session.user = safe
    req.session.save((err) => {
      if (err) return next(err)
      res.json(safe)
    })
  } catch (err) {
    next(err)
  }
})

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.json(null)
  }
  res.json(req.session.user)
})

app.put('/api/auth/me', async (req, res, next) => {
  try {
    const me = req.session.user
    if (!me) return res.status(401).json({ error: 'Not signed in' })
    const { userName, email, currentPassword, newPassword } = req.body
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' })
    }
    const { rows } = await pool.query(
      `SELECT id, user_name AS "userName", email, role, password
       FROM users WHERE id = $1`,
      [me.id],
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Session expired — please sign in again' })
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password).catch(() => false)
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }
    const updatedUserName = typeof userName === 'string' && userName.trim() ? userName.trim() : user.userName
    const updatedEmail = typeof email === 'string' ? email.trim() || null : user.email
    const updatedPasswordHash =
      typeof newPassword === 'string' && newPassword.trim()
        ? await bcrypt.hash(newPassword.trim(), 10)
        : user.password

    const { rows: updatedRows } = await pool.query(
      `UPDATE users
       SET user_name = $2, email = $3, password = $4
       WHERE id = $1
       RETURNING id, user_name AS "userName", email, role`,
      [user.id, updatedUserName, updatedEmail, updatedPasswordHash],
    )
    const safe = updatedRows[0]
    req.session.user = safe
    req.session.save((err) => {
      if (err) return next(err)
      res.json(safe)
    })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' })
    }
    next(err)
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('studio.sid')
  if (req.session) {
    req.session.destroy(() => {
      res.status(204).end()
    })
  } else {
    res.status(204).end()
  }
})

const frontendDist = process.env.FRONTEND_DIST ?? fileURLToPath(new URL('../../frontend/dist', import.meta.url))
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const port = Number(process.env.PORT ?? 4000)
const host = process.env.HOST ?? '0.0.0.0'
const tlsPfx = process.env.HTTPS_PFX

if (tlsPfx) {
  const server = https.createServer(
    {
      pfx: readFileSync(tlsPfx),
      passphrase: process.env.HTTPS_PFX_PASS,
    },
    app,
  )
  server.listen(port, host, () => {
    console.log(`AG Studio serving HTTPS on https://${host}:${port}`)
  })
} else {
  app.listen(port, host, () => {
    console.log(`AG Studio serving HTTP on http://${host}:${port}`)
  })
}
