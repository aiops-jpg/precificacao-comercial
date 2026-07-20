import path from 'path'
import Automizer from 'pptx-automizer'
import { auth } from '@/auth'
import { getPool } from '@/lib/db'
import { calcular } from '@/lib/precificacao'
import { getSlidesDaProposta, getEdicoesPorSlide } from '@/lib/proposta'

export const runtime = 'nodejs'

const TEMPLATE_FILE = 'proposta-template.pptx'

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function applyEdit(element, edit) {
  if (edit.type === 'run') {
    const node = element.getElementsByTagName('a:t').item(edit.run)
    if (node && node.firstChild) node.firstChild.data = edit.text
  } else if (edit.type === 'replace') {
    const node = element.getElementsByTagName('a:t').item(0)
    if (node && node.firstChild) node.firstChild.data = node.firstChild.data.split(edit.from).join(edit.to)
  } else if (edit.type === 'resize') {
    const ext = element.getElementsByTagName('a:ext').item(0)
    if (ext) {
      if (edit.cx) ext.setAttribute('cx', String(edit.cx))
      if (edit.cy) ext.setAttribute('cy', String(edit.cy))
    }
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { form, discovery, config } = body

    const result = calcular(form, discovery.canais_ativos, config)
    const slides = getSlidesDaProposta(discovery.canais_ativos)
    const edicoes = getEdicoesPorSlide(result, discovery, config)

    // Log da geração — guarda o cálculo completo (não só metadados), útil pra auditoria de
    // quanto foi cobrado numa proposta específica. Não deve derrubar a geração se falhar.
    try {
      const session = await auth()
      const pool = getPool()
      await pool.query(
        'INSERT INTO activity_log (tipo, usuario, detalhes) VALUES ($1, $2, $3)',
        ['proposta_gerada', session?.user?.email || null, JSON.stringify({
          nomeCliente: discovery.nomeCliente,
          numeroProposta: discovery.numeroProposta,
          canais_ativos: discovery.canais_ativos,
          form,
          discovery,
          result,
        })]
      )
    } catch (logErr) {
      console.error('Falha ao registrar log de proposta:', logErr)
    }

    const automizer = new Automizer({
      templateDir: path.join(process.cwd(), 'templates'),
      outputDir: path.join(process.cwd(), 'templates'),
      removeExistingSlides: true,
      verbosity: 0,
      cleanup: true,
    })

    let pres = automizer.loadRoot(TEMPLATE_FILE).load(TEMPLATE_FILE, 'template')

    for (const slideNum of slides) {
      const edits = edicoes[slideNum]
      if (edits && edits.length) {
        const byShape = {}
        edits.forEach((e) => { (byShape[e.shape] ||= []).push(e) })
        pres = pres.addSlide('template', slideNum, (slide) => {
          Object.entries(byShape).forEach(([shapeName, shapeEdits]) => {
            // 'remove' tira o card inteiro (produto não selecionado no Discovery) — não dá pra
            // misturar com edição de texto no mesmo shape, então tem prioridade sobre os outros.
            if (shapeEdits.some((e) => e.type === 'remove')) {
              slide.removeElement(shapeName)
              return
            }
            slide.modifyElement(shapeName, (element) => {
              shapeEdits.forEach((e) => applyEdit(element, e))
            })
          })
        })
      } else {
        pres = pres.addSlide('template', slideNum)
      }
    }

    const stream = await pres.stream()
    const buffer = await streamToBuffer(stream)

    const nomeArquivoSeguro = (discovery.nomeCliente || 'Cliente').replace(/[\\/:*?"<>|]/g, '')
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="Proposta - ${nomeArquivoSeguro}.pptx"`,
      },
    })
  } catch (err) {
    console.error('Erro ao gerar proposta:', err)
    return new Response(err?.message || 'Erro desconhecido ao gerar a proposta.', { status: 500 })
  }
}
