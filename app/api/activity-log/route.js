import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

// Log público, mas só aceita o tipo "preco_sessao" (ajuste local, sem login, no botão
// "Salvar Alterações"). Os outros tipos (preco_global, proposta_gerada) são logados
// direto pelas próprias rotas server-side que fazem essas ações, pra não dar pra
// forjar um log de "alteração global"/"proposta" chamando esse endpoint na mão.
const TIPOS_PUBLICOS = new Set(['preco_sessao'])

export async function POST(req) {
  const body = await req.json()
  if (!TIPOS_PUBLICOS.has(body.tipo)) {
    return new Response('Tipo de log não permitido aqui', { status: 403 })
  }
  const pool = getPool()
  await pool.query(
    'INSERT INTO activity_log (tipo, usuario, detalhes) VALUES ($1, $2, $3)',
    [body.tipo, null, JSON.stringify(body.detalhes || {})]
  )
  return Response.json({ ok: true })
}
