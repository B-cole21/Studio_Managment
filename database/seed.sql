-- AG Studio seed data (matches src/lib/mock.ts)
-- Run after schema.sql:
--   psql -U postgres -d ag_studio -f seed.sql

INSERT INTO service (id, name, duration_min, is_birthday) VALUES
  ('svc-portrait', 'Portrait package', 60, FALSE),
  ('svc-maternity', 'Maternity package', 60, FALSE),
  ('svc-family', 'Family package', 60, FALSE),
  ('svc-headshots', 'Headshot package', 60, FALSE),
  ('svc-birthday', 'Birthday package', 60, TRUE);

INSERT INTO users (user_name, password, email, role) VALUES
 ('biruk', 'password', 'biruk@agstudio.com', 'cameraman'),
  ('admin', 'password', 'cashier@agstudio.com', 'cashier'),
  ('tig', 'password', 'boss@agstudio.com', 'owner')
ON CONFLICT (user_name) DO NOTHING;

INSERT INTO settings (id, studio_name, phone, address, hours, backup_at) VALUES
  (1, 'AG Studio', '+251 953255649', 'Ethiopia , Bahir Dar',
   '[{"days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], "open": "09:00", "close": "18:00"}]',
   'Today 03:00');
