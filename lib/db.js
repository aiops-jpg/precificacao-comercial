import { Pool } from 'pg'

let pool

// Reusa a mesma pool entre chamadas de rota (serverless) — recriar a cada request esgota
// conexões do Neon rapidinho.
export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}
