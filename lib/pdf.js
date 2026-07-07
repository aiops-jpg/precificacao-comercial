import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export function buildSummaryHTML(discovery, result, form, formatMoney, formatPct) {
  const o = result.orcamentos
  const c = result.categorias
  const total = c.total

  const canalRows = Object.entries(o)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${formatMoney(v)}</td><td style="text-align:right">${formatPct(v / total * 100)}</td></tr>`)
    .join('')

  return `
    <div style="font-family:sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#172c66">
      <div style="text-align:center;margin-bottom:32px">
        <h1 style="font-size:24px;margin:0">PGMais</h1>
        <p style="font-size:14px;color:#666">Proposta Comercial — Precificação</p>
      </div>

      <div style="margin-bottom:24px">
        <h2 style="font-size:16px;border-bottom:2px solid #172c66;padding-bottom:8px">📋 Discovery</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          ${discovery.tipo_cliente ? `<tr><td style="padding:4px 8px;font-weight:700">Segmento</td><td style="padding:4px 8px">${discovery.tipo_cliente}</td></tr>` : ''}
          ${discovery.objetivo ? `<tr><td style="padding:4px 8px;font-weight:700">Objetivo</td><td style="padding:4px 8px">${discovery.objetivo}</td></tr>` : ''}
          ${discovery.cpfs ? `<tr><td style="padding:4px 8px;font-weight:700">CPFs ativos</td><td style="padding:4px 8px">${parseFloat(discovery.cpfs).toLocaleString('pt-BR')}</td></tr>` : ''}
          ${discovery.faturas ? `<tr><td style="padding:4px 8px;font-weight:700">Faturas/mês</td><td style="padding:4px 8px">${parseFloat(discovery.faturas).toLocaleString('pt-BR')}</td></tr>` : ''}
          ${discovery.pct_adimplentes ? `<tr><td style="padding:4px 8px;font-weight:700">Adimplentes</td><td style="padding:4px 8px">${discovery.pct_adimplentes}%</td></tr>` : ''}
          ${discovery.tx_recup_30 ? `<tr><td style="padding:4px 8px;font-weight:700">Recup. 30 dias</td><td style="padding:4px 8px">${discovery.tx_recup_30}%</td></tr>` : ''}
          ${discovery.tx_recup_60 ? `<tr><td style="padding:4px 8px;font-weight:700">Recup. 60 dias</td><td style="padding:4px 8px">${discovery.tx_recup_60}%</td></tr>` : ''}
          ${discovery.tx_recup_90 ? `<tr><td style="padding:4px 8px;font-weight:700">Recup. 90 dias</td><td style="padding:4px 8px">${discovery.tx_recup_90}%</td></tr>` : ''}
          ${discovery.qualidade_dados ? `<tr><td style="padding:4px 8px;font-weight:700">Qualidade dados</td><td style="padding:4px 8px">${discovery.qualidade_dados}</td></tr>` : ''}
          ${discovery.sistema_dividas ? `<tr><td style="padding:4px 8px;font-weight:700">Sistema dívidas</td><td style="padding:4px 8px">${discovery.sistema_dividas}</td></tr>` : ''}
          ${discovery.sla_cargas ? `<tr><td style="padding:4px 8px;font-weight:700">SLA cargas</td><td style="padding:4px 8px">${discovery.sla_cargas}</td></tr>` : ''}
          ${discovery.broker ? `<tr><td style="padding:4px 8px;font-weight:700">Infraestrutura</td><td style="padding:4px 8px">${discovery.broker}</td></tr>` : ''}
          ${discovery.canais_falha?.length ? `<tr><td style="padding:4px 8px;font-weight:700">Canais que falharam</td><td style="padding:4px 8px">${discovery.canais_falha.join(', ')}</td></tr>` : ''}
          ${discovery.tem_automacao ? `<tr><td style="padding:4px 8px;font-weight:700">Tem automação</td><td style="padding:4px 8px">${discovery.tem_automacao}</td></tr>` : ''}
          ${discovery.api_carga || discovery.api_consulta || discovery.api_boleto ? `<tr><td style="padding:4px 8px;font-weight:700">APIs necessárias</td><td style="padding:4px 8px">${[discovery.api_carga ? 'Carga' : '', discovery.api_consulta ? 'Consulta' : '', discovery.api_boleto ? 'Boleto' : ''].filter(Boolean).join(', ')}</td></tr>` : ''}
        </table>
      </div>

      <div style="margin-bottom:24px">
        <h2 style="font-size:16px;border-bottom:2px solid #172c66;padding-bottom:8px">💰 Orçamento</h2>
        <div style="display:flex;gap:16px;margin-bottom:16px">
          <div style="flex:1;background:#172c66;color:#fff;padding:12px 16px;border-radius:8px;text-align:center">
            <div style="font-size:11px;text-transform:uppercase;opacity:0.7">Total Geral</div>
            <div style="font-size:20px;font-weight:900">${formatMoney(total)}</div>
          </div>
          <div style="flex:1;background:#f5f5f7;padding:12px 16px;border-radius:8px;text-align:center">
            <div style="font-size:11px;text-transform:uppercase;color:#888">ONE</div>
            <div style="font-size:18px;font-weight:900;color:#172c66">${formatMoney(c.one)}</div>
          </div>
          <div style="flex:1;background:#f5f5f7;padding:12px 16px;border-radius:8px;text-align:center">
            <div style="font-size:11px;text-transform:uppercase;color:#888">SMS</div>
            <div style="font-size:18px;font-weight:900;color:#172c66">${formatMoney(c.sms)}</div>
          </div>
          <div style="flex:1;background:#f5f5f7;padding:12px 16px;border-radius:8px;text-align:center">
            <div style="font-size:11px;text-transform:uppercase;color:#888">Digital</div>
            <div style="font-size:18px;font-weight:900;color:#172c66">${formatMoney(c.digital)}</div>
          </div>
        </div>
      </div>

      <div>
        <h2 style="font-size:16px;border-bottom:2px solid #172c66;padding-bottom:8px">📊 Distribuição por Canal</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#172c66;color:#fff">
              <th style="padding:8px 12px;text-align:left">Canal</th>
              <th style="padding:8px 12px;text-align:right">Total</th>
              <th style="padding:8px 12px;text-align:right">%</th>
            </tr>
          </thead>
          <tbody>
            ${canalRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#999;text-align:center">
        Gerado em ${new Date().toLocaleDateString('pt-BR')} — PGMais Precificação Comercial
      </div>
    </div>
  `
}

export async function generatePDF(summaryHTML) {
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '-9999px'
  wrapper.style.top = '0'
  wrapper.style.width = '800px'
  wrapper.innerHTML = summaryHTML
  document.body.appendChild(wrapper)

  const canvas = await html2canvas(wrapper, {
    scale: 2,
    useCORS: true,
    logging: false,
    width: 800,
  })

  document.body.removeChild(wrapper)

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pdfW = 210
  const pdfH = (canvas.height * pdfW) / canvas.width

  let heightLeft = pdfH
  let position = 0
  const pageH = 297

  pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH)
  heightLeft -= pageH

  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH)
    heightLeft -= pageH
  }

  return pdf
}
