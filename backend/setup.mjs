import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pool } from './src/db.js'

const databaseDir = fileURLToPath(new URL('../database/', import.meta.url))

const schema = await readFile(`${databaseDir}schema.sql`, 'utf8')
await pool.query(schema)
console.log('schema.sql applied')

const seed = await readFile(`${databaseDir}seed.sql`, 'utf8')
await pool.query(seed)
console.log('seed.sql applied')

await pool.end()
