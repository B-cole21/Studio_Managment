-- AG Studio schema
-- Run this inside the ag_studio database:
--   psql -U postgres -d ag_studio -f schema.sql

DROP TABLE IF EXISTS package;
DROP TABLE IF EXISTS booking;
DROP TABLE IF EXISTS service;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;

CREATE TABLE users (
  id        SERIAL PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,
  email     TEXT,
  role      TEXT NOT NULL DEFAULT 'cameraman'
);

CREATE TABLE service (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  duration_min  INTEGER NOT NULL,
  is_birthday   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE booking (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT '',
  event         TEXT NOT NULL,
  date          DATE NOT NULL,
  time          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  age           INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE package (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  phone                TEXT NOT NULL,
  quantity             INTEGER,
  frame                TEXT,
  first_payment        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  second_payment       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  second_payment_type  TEXT DEFAULT 'Cash',
  remainder            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remainder_payment_type TEXT,
  date                 DATE,
  payment_type         TEXT NOT NULL DEFAULT 'Cash',
  full_payment         BOOLEAN NOT NULL DEFAULT FALSE,
  first_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  first_confirmed_by   INTEGER,
  first_confirmed_at   TIMESTAMPTZ,
  first_cashier_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  first_cashier_confirmed_by   INTEGER,
  first_cashier_confirmed_at   TIMESTAMPTZ,
  remainder_received   BOOLEAN NOT NULL DEFAULT FALSE,
  remainder_received_at TIMESTAMPTZ,
  remainder_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  remainder_confirmed_by INTEGER,
  remainder_confirmed_at TIMESTAMPTZ,
  remainder_cashier_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  remainder_cashier_confirmed_by   INTEGER,
  remainder_cashier_confirmed_at   TIMESTAMPTZ,
  second_payment_confirmed         BOOLEAN NOT NULL DEFAULT FALSE,
  second_payment_confirmed_by      INTEGER,
  second_payment_confirmed_at      TIMESTAMPTZ,
  second_payment_cashier_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  second_payment_cashier_confirmed_by INTEGER,
  second_payment_cashier_confirmed_at TIMESTAMPTZ,
  created_by            INTEGER,
  created_by_name       TEXT,
  pending_selection     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE settings (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  studio_name          TEXT,
  phone                TEXT,
  address              TEXT,
  hours                JSONB,
  backup_at            TEXT,
  allow_double_booking BOOLEAN NOT NULL DEFAULT TRUE,
  camera_count         INTEGER NOT NULL DEFAULT 2
);

CREATE INDEX idx_booking_date ON booking (date);
CREATE INDEX idx_users_user_name ON users (user_name);
CREATE INDEX idx_users_lower_user_name ON users (LOWER(user_name));
CREATE INDEX idx_package_date ON package (date DESC);
CREATE INDEX idx_package_created_at ON package (created_at DESC);
CREATE INDEX idx_package_phone_date ON package (phone, date);
CREATE INDEX idx_package_lower_name ON package (LOWER(TRIM(name)));


