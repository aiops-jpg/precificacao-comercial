import { auth } from '@/auth'
import { getPool } from '@/lib/db'
import { PRICING_DEFAULTS } from '@/lib/pricingDefaults'

export const runtime = 'nodejs'

// Base de preços GLOBAL (afeta todo mundo) — GET é público (o app precisa ler pra montar a
// Calculadora); PUT só funciona autenticado, e cada save vira uma nova linha (histórico simples).
export async function GET() {
  try {
    const pool = getPool()
    const { rows } = await pool.query('SELECT data FROM pricing_base ORDER BY id DESC LIMIT 1')
    return Response.json(rows[0]?.data || PRICING_DEFAULTS)
  } catch {
    return Response.json(PRICING_DEFAULTS)
  }
}

export async function PUT(req) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Não autenticado', { status: 401 })
  }
  const body = await req.json()
  const pool = getPool()
  await pool.query(
    'INSERT INTO pricing_base (data, updated_by) VALUES ($1, $2)',
    [JSON.stringify(body), session.user.email]
  )
  return Response.json({ ok: true, updated_by: session.user.email })
}
