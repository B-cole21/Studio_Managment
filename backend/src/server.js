import express from 'express'
import cors from 'cors'
import session from 'express-session'
import nodemailer from 'nodemailer'
import { existsSync, readFileSync } from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool, nextId } from './db.js'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use(
  session({
    name: 'studio.sid',
    secret: process.env.SESSION_SECRET ?? 'studio-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.SESSION_SECURE === 'true',
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

app.get('/api/booking', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, customer_name AS "customerName", event, date::text AS "date", time, phone, age
       FROM booking ORDER BY date, time`,
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

app.post('/api/booking', async (req, res, next) => {
  try {
    const { customerName, event, date, time, phone, age } = req.body
    if (!customerName || !event || !date || !time || !phone) {
      return res.status(400).json({ error: 'customerName, event, date, time and phone are required' })
    }
    const { rows } = await pool.query(
      `INSERT INTO booking (customer_name, event, date, time, phone, age)
       VALUES ($1, $2, $3::date, $4, $5, $6)
       RETURNING id, customer_name AS "customerName", event, date::text AS "date", time, phone, age`,
      [customerName, event, date, time, phone, age ?? null],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.put('/api/booking/:id', async (req, res, next) => {
  try {
    const { customerName, event, date, time, phone, age } = req.body
    const { rows } = await pool.query(
      `UPDATE booking
       SET customer_name = COALESCE($2, customer_name),
           event = COALESCE($3, event),
           date = COALESCE($4::date, date),
           time = COALESCE($5, time),
           phone = COALESCE($6, phone),
           age = COALESCE($7, age)
       WHERE id = $1
       RETURNING id, customer_name AS "customerName", event, date::text AS "date", time, phone, age`,
      [req.params.id, customerName, event, date, time, phone, age],
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
         remainder_payment_type AS "remainderPaymentType"
  FROM package`

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

app.post('/api/package', requireRole(['cashier', 'cameraman']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { name, phone, quantity, frame, firstPayment, secondPayment, remainder, date, fullPayment, paymentType, pendingSelection, remainderPaymentType } = req.body
    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' })
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
    const type = ['Cash', 'Bank'].includes(paymentType) ? paymentType : 'Cash'
    const rType = ['Cash', 'Bank'].includes(remainderPaymentType) ? remainderPaymentType : null
    if (first < 0 || second < 0 || (rest != null && rest < 0)) return res.status(400).json({ error: 'Payments cannot be negative' })
    const id = await nextId('package', 'pkg')
    const { rows } = await pool.query(
      `INSERT INTO package (id, name, phone, quantity, frame, first_payment, second_payment, remainder, date, payment_type, full_payment,
                            created_by, created_by_name, pending_selection,
                            first_cashier_confirmed, first_cashier_confirmed_by, first_cashier_confirmed_at,
                            remainder_payment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id, name, phone, quantity, frame, first_payment AS "firstPayment",
                 second_payment AS "secondPayment",
                 remainder, date::text AS "date", payment_type AS "paymentType", full_payment AS "fullPayment",
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
                 created_by AS "createdBy", created_by_name AS "createdByName", pending_selection AS "pendingSelection",
                 remainder_payment_type AS "remainderPaymentType"`,
      [id, name, phone, qty, frame ?? null, first, second, rest, date ?? null, type, full, me.id, me.userName, isPending,
       isCashier, isCashier ? me.id : null, isCashier ? new Date() : null, rType],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    next(err)
  }
})

app.put('/api/package/:id', requireRole(['cashier', 'owner', 'cameraman']), async (req, res, next) => {
  try {
    const me = req.session.user
    const { name, phone, firstPayment, secondPayment, remainder, remainderReceived, quantity, frame, date, paymentType, fullPayment, pendingSelection, remainderPaymentType } = req.body
    const { rows } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
    const pkg = rows[0]
    if (!pkg) return res.status(404).json({ error: 'Package not found' })

    const updates = []
    const values = []

    if (name != null && name.trim() && name.trim() !== pkg.name) {
      updates.push('name = $' + (values.length + 2))
      values.push(name.trim())
    }

    if (phone != null && phone.trim() !== (pkg.phone ?? '')) {
      updates.push('phone = $' + (values.length + 2))
      values.push(phone.trim())
    }

    if (pendingSelection === false && pkg.pendingSelection) {
      updates.push('pending_selection = FALSE')
      if (me.role !== 'owner') {
        updates.push('first_confirmed = FALSE')
        updates.push('first_confirmed_by = NULL')
        updates.push('first_confirmed_at = NULL')
        updates.push('second_payment_confirmed = FALSE')
        updates.push('second_payment_confirmed_by = NULL')
        updates.push('second_payment_confirmed_at = NULL')
        updates.push('remainder_confirmed = FALSE')
        updates.push('remainder_confirmed_by = NULL')
        updates.push('remainder_confirmed_at = NULL')
        if (me.role === 'cashier') {
          updates.push('first_cashier_confirmed = TRUE')
          updates.push('first_cashier_confirmed_by = $' + (values.length + 2))
          values.push(me.id)
          updates.push('first_cashier_confirmed_at = NOW()')
        }
      }
    }

    if (quantity != null && Number(quantity) !== Number(pkg.quantity)) {
      if (!pkg.pendingSelection && pkg.firstConfirmed && me.role !== 'owner' && me.role !== 'cashier') return res.status(400).json({ error: 'Package is confirmed and locked' })
      if (Number(quantity) <= 0) return res.status(400).json({ error: 'Quantity must be positive' })
      updates.push('quantity = $' + (values.length + 2))
      values.push(Number(quantity))
    }

    if (frame != null && frame !== (pkg.frame ?? '')) {
      updates.push('frame = $' + (values.length + 2))
      values.push(frame || null)
    }

    if (date != null && date !== pkg.date) {
      updates.push('date = $' + (values.length + 2))
      values.push(date)
    }

    if (paymentType != null && paymentType !== pkg.paymentType) {
      const type = ['Cash', 'Bank'].includes(paymentType) ? paymentType : 'Cash'
      updates.push('payment_type = $' + (values.length + 2))
      values.push(type)
    }

    if (fullPayment != null && Boolean(fullPayment) !== pkg.fullPayment) {
      updates.push('full_payment = $' + (values.length + 2))
      values.push(Boolean(fullPayment))
      if (fullPayment) {
        updates.push('remainder = 0')
      }
    }

    if (firstPayment != null && Number(firstPayment) !== Number(pkg.firstPayment)) {
      const isCompleting = pendingSelection === false && pkg.pendingSelection
      if (pkg.firstConfirmed && !isCompleting && me.role !== 'owner' && me.role !== 'cashier') return res.status(400).json({ error: 'First payment is confirmed and locked' })
      if (!pkg.pendingSelection && !isCompleting && me.role !== 'owner' && me.role !== 'cashier') return res.status(403).json({ error: 'Only the cashier or owner can change the first payment' })
      if (Number(firstPayment) < 0) return res.status(400).json({ error: 'Payments cannot be negative' })
      updates.push('first_payment = $' + (values.length + 2))
      values.push(Number(firstPayment))
      if (me.role !== 'owner' && pkg.firstCashierConfirmed) {
        updates.push('first_cashier_confirmed = FALSE')
        updates.push('first_cashier_confirmed_by = NULL')
        updates.push('first_cashier_confirmed_at = NULL')
      }
      if (pkg.firstConfirmed) {
        updates.push('first_confirmed = FALSE')
        updates.push('first_confirmed_by = NULL')
        updates.push('first_confirmed_at = NULL')
      }
    }

    if (secondPayment != null && Number(secondPayment) !== Number(pkg.secondPayment)) {
      if (Number(secondPayment) < 0) return res.status(400).json({ error: 'Payments cannot be negative' })
      updates.push('second_payment = $' + (values.length + 2))
      values.push(Number(secondPayment))
      if (me.role === 'cashier' && Number(secondPayment) > 0) {
        updates.push('second_payment_cashier_confirmed = TRUE')
        updates.push('second_payment_cashier_confirmed_by = $' + (values.length + 2))
        values.push(me.id)
        updates.push('second_payment_cashier_confirmed_at = NOW()')
      } else if (pkg.secondPaymentCashierConfirmed) {
        updates.push('second_payment_cashier_confirmed = FALSE')
        updates.push('second_payment_cashier_confirmed_by = NULL')
        updates.push('second_payment_cashier_confirmed_at = NULL')
      }
      if (pkg.secondPaymentConfirmed) {
        updates.push('second_payment_confirmed = FALSE')
        updates.push('second_payment_confirmed_by = NULL')
        updates.push('second_payment_confirmed_at = NULL')
      }
    }

    if (remainder != null && Number(remainder) !== Number(pkg.remainder)) {
      if (pkg.fullPayment) return res.status(400).json({ error: 'Full payment package cannot have a remainder' })
      if (pkg.remainderConfirmed && me.role !== 'owner' && me.role !== 'cashier') return res.status(400).json({ error: 'Remainder is confirmed and locked' })
      if (Number(remainder) < 0) return res.status(400).json({ error: 'Payments cannot be negative' })
      updates.push('remainder = $' + (values.length + 2))
      values.push(Number(remainder))
      if (me.role !== 'owner' && pkg.remainderConfirmed) {
        updates.push('remainder_confirmed = FALSE')
        updates.push('remainder_confirmed_by = NULL')
        updates.push('remainder_confirmed_at = NULL')
      }
    }

    if (remainderReceived != null && remainderReceived !== pkg.remainderReceived) {
      if (pkg.fullPayment) return res.status(400).json({ error: 'Full payment package has no remainder' })
      if (pkg.remainderConfirmed && me.role !== 'owner' && me.role !== 'cashier') return res.status(400).json({ error: 'Remainder is confirmed and locked' })
      updates.push('remainder_received = $' + (values.length + 2))
      values.push(Boolean(remainderReceived))
      updates.push('remainder_received_at = ' + (remainderReceived ? 'NOW()' : 'NULL'))
      if (me.role !== 'owner') {
        updates.push('remainder_confirmed = FALSE')
        updates.push('remainder_confirmed_by = NULL')
        updates.push('remainder_confirmed_at = NULL')
      }
      if (remainderReceived && me.role === 'cashier') {
        updates.push('remainder_cashier_confirmed = TRUE')
        updates.push('remainder_cashier_confirmed_by = $' + (values.length + 2))
        values.push(me.id)
        updates.push('remainder_cashier_confirmed_at = NOW()')
      }
    }

    if (remainderPaymentType !== undefined && remainderPaymentType !== pkg.remainderPaymentType) {
      const rt = ['Cash', 'Bank'].includes(remainderPaymentType) ? remainderPaymentType : null
      updates.push('remainder_payment_type = $' + (values.length + 2))
      values.push(rt)
    }

    if (updates.length === 0) return res.json(pkg)

    const sql = `UPDATE package SET ${updates.join(', ')} WHERE id = $1`
    await pool.query(sql, [req.params.id, ...values])
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    if (pkg.firstCashierConfirmed) return res.status(400).json({ error: 'First payment already cashier-confirmed' })
    if (pkg.firstConfirmed) return res.status(400).json({ error: 'First payment already confirmed by owner' })
    await pool.query(
      `UPDATE package
       SET first_cashier_confirmed = TRUE, first_cashier_confirmed_by = $2, first_cashier_confirmed_at = NOW()
       WHERE id = $1`,
      [req.params.id, me.id],
    )
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    if (!pkg.firstCashierConfirmed) return res.status(400).json({ error: 'Cashier has not confirmed the first payment yet' })
    await pool.query(
      `UPDATE package
       SET first_confirmed = TRUE, first_confirmed_by = $2, first_confirmed_at = NOW()
       WHERE id = $1`,
      [req.params.id, me.id],
    )
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    if (pkg.remainderCashierConfirmed) return res.status(400).json({ error: 'Remainder already cashier-confirmed' })
    if (pkg.remainderConfirmed) return res.status(400).json({ error: 'Remainder already confirmed by owner' })
    if (!pkg.remainderReceived) return res.status(400).json({ error: 'Remainder payment has not been recorded yet' })
    await pool.query(
      `UPDATE package
       SET remainder_cashier_confirmed = TRUE, remainder_cashier_confirmed_by = $2, remainder_cashier_confirmed_at = NOW()
       WHERE id = $1`,
      [req.params.id, me.id],
    )
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    if (!pkg.remainderCashierConfirmed) return res.status(400).json({ error: 'Cashier has not confirmed the remainder payment yet' })
    await pool.query(
      `UPDATE package
       SET remainder_confirmed = TRUE, remainder_confirmed_by = $2, remainder_confirmed_at = NOW()
       WHERE id = $1`,
      [req.params.id, me.id],
    )
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    if (pkg.secondPayment <= 0) return res.status(400).json({ error: 'No second payment on this package' })
    if (pkg.secondPaymentCashierConfirmed) return res.status(400).json({ error: 'Second payment already cashier-confirmed' })
    if (pkg.secondPaymentConfirmed) return res.status(400).json({ error: 'Second payment already confirmed by owner' })
    await pool.query(
      `UPDATE package
       SET second_payment_cashier_confirmed = TRUE, second_payment_cashier_confirmed_by = $2, second_payment_cashier_confirmed_at = NOW()
       WHERE id = $1`,
      [req.params.id, me.id],
    )
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    if (!pkg.secondPaymentCashierConfirmed) return res.status(400).json({ error: 'Cashier has not confirmed the second payment yet' })
    await pool.query(
      `UPDATE package
       SET second_payment_confirmed = TRUE, second_payment_confirmed_by = $2, second_payment_confirmed_at = NOW()
       WHERE id = $1`,
      [req.params.id, me.id],
    )
    const { rows: updated } = await pool.query(`${packageSelect} WHERE id = $1`, [req.params.id])
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
    const { rows } = await pool.query(
      `INSERT INTO settings (id, studio_name, phone, address, hours, backup_at, allow_double_booking, camera_count)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         studio_name = COALESCE($1, settings.studio_name),
         phone = COALESCE($2, settings.phone),
         address = COALESCE($3, settings.address),
         hours = COALESCE($4, settings.hours),
         backup_at = COALESCE($5, settings.backup_at),
         allow_double_booking = COALESCE($6, settings.allow_double_booking),
         camera_count = COALESCE($7, settings.camera_count)
       RETURNING studio_name AS "studioName", phone, address, hours, backup_at AS "backupAt",
                 allow_double_booking AS "allowDoubleBooking", camera_count AS "cameraCount"`,
      [studioName, phone, address, hours, backupAt, allowDoubleBooking ?? true, cameraCount ?? 2],
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
       FROM users WHERE user_name = $1`,
      [userName],
    )
    const user = rows[0]
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }
    const { password: _hidden, ...safe } = user
    req.session.user = safe
    res.json(safe)
  } catch (err) {
    next(err)
  }
})

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

async function sendOtpEmail(toEmail, otpCode, userName) {
  const transporter = createTransporter()
  if (!transporter) {
    console.warn(`[Mailer Warning] SMTP credentials (SMTP_USER & SMTP_PASS) not set in backend/.env. OTP for ${toEmail} is ${otpCode}`)
    return { success: false, error: 'SMTP credentials (SMTP_USER & SMTP_PASS) are missing in backend/.env' }
  }

  const fromName = process.env.SMTP_FROM_NAME || 'AG Studio'
  const fromEmail = process.env.SMTP_USER

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #d97706; margin-top: 0;">${fromName} Password Reset</h2>
      <p style="color: #374151; font-size: 15px;">Hello <strong>${userName}</strong>,</p>
      <p style="color: #4b5563; font-size: 14px;">You requested to reset your password. Your 6-digit verification code is:</p>
      <div style="background-color: #fef3c7; color: #92400e; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 18px; border-radius: 8px; margin: 24px 0;">
        ${otpCode}
      </div>
      <p style="font-size: 13px; color: #6b7280;">This code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
      <p style="font-size: 11px; color: #9ca3af; text-align: center;">© ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `${otpCode} is your ${fromName} password reset verification code`,
      html: htmlContent,
    })
    return { success: true }
  } catch (err) {
    console.error('[Mailer Error]', err)
    return { success: false, error: err.message }
  }
}

app.post('/api/auth/request-otp', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Registered email address is required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    console.log('[OTP Request] Searching for registered user with email:', cleanEmail)
    const { rows } = await pool.query(
      `SELECT id, user_name AS "userName", email FROM users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail],
    )
    const user = rows[0]
    if (!user) {
      console.log('[OTP Request Error] No match found for email:', cleanEmail)
      return res.status(404).json({ error: `No account registered with email "${cleanEmail}"` })
    }

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await pool.query(
      `UPDATE users SET reset_otp = $2, reset_otp_expires_at = $3 WHERE id = $1`,
      [user.id, otp, expiresAt],
    )

    const mailResult = await sendOtpEmail(user.email, otp, user.userName)

    if (!mailResult.success) {
      return res.status(500).json({ error: `Could not send email: ${mailResult.error}` })
    }

    res.json({ message: `Verification code sent to ${user.email}` })
  } catch (err) {
    next(err)
  }
})

app.post('/api/auth/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()

    const { rows } = await pool.query(
      `SELECT id, reset_otp, reset_otp_expires_at FROM users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail],
    )
    const user = rows[0]
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address' })
    }

    if (!user.reset_otp || user.reset_otp !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code' })
    }

    if (new Date(user.reset_otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' })
    }

    res.json({ message: 'Verification code confirmed' })
  } catch (err) {
    next(err)
  }
})

app.post('/api/auth/reset-password-otp', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required' })
    }

    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()

    const { rows } = await pool.query(
      `SELECT id, reset_otp, reset_otp_expires_at FROM users WHERE LOWER(email) = LOWER($1)`,
      [cleanEmail],
    )
    const user = rows[0]
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address' })
    }

    if (!user.reset_otp || user.reset_otp !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code' })
    }

    if (new Date(user.reset_otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' })
    }

    await pool.query(
      `UPDATE users SET password = $2, reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = $1`,
      [user.id, newPassword.trim()],
    )

    res.json({ message: 'Password updated successfully' })
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
    if (user.password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }
    const updatedUserName = typeof userName === 'string' && userName.trim() ? userName.trim() : user.userName
    const updatedEmail = typeof email === 'string' ? email.trim() || null : user.email
    const { rows: updatedRows } = await pool.query(
      `UPDATE users
       SET user_name = $2, email = $3, password = COALESCE($4, password)
       WHERE id = $1
       RETURNING id, user_name AS "userName", email, role`,
      [user.id, updatedUserName, updatedEmail, newPassword ?? null],
    )
    const safe = updatedRows[0]
    req.session.user = safe
    res.json(safe)
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' })
    }
    next(err)
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Failed to sign out' })
    res.clearCookie('studio.sid')
    res.status(204).end()
  })
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
  res.status(500).json({ error: 'Internal server error' })
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
