'use client'

import { useState, useMemo, useRef } from 'react'
import { calcular, formatMoney, formatPct } from '@/lib/precificacao'
import { buildSummaryHTML, generatePDF } from '@/lib/pdf'
import DiscoveryForm from '@/components/DiscoveryForm'

const DISCOVERY_INITIAL = {
  cpfs: '', faturas: '', pct_adimplentes: '',
  tx_recup_30: '', tx_recup_60: '', tx_recup_90: '',
  tipo_cliente: '', objetivo: '',
  tem_automacao: '', sistema_dividas: '', direcionamento: '',
  canais_falha: [], canais_ativos: [], qualidade_dados: '',
  api_carga: false, api_consulta: false, api_boleto: false,
  sla_cargas: '', broker: '',
}

const INITIAL = {
  cpfs: 57600, faturas: 75000,
  sms_texto: 46615, sms_whats: 63027, sms_landing: 0, sms_imagem: 30000,
  whats_ativo: 63732, whats_receptivo: 0,
  voicebot: 0, voz_humana: 0, rcs: 17626, email: 45216,
  email_fatura: 77148, imagem_fatura: 77148,
  chatbot: 0, enriquecimento: 57600,
  google_meta_ads: 0, cartas_fisico: 0,
}

const FIELDS = [
  { section: 'Base', full: true, cols: 2, fields: [
    { key: 'cpfs', label: 'Volume total de CPFs/CNPJs ativos' },
    { key: 'faturas', label: 'Volume total de faturas/cartões mensais' },
  ]},
  { section: 'SMS', cols: 2, fields: [
    { key: 'sms_texto', label: 'Texto Padrão' },
    { key: 'sms_whats', label: 'Com link para WhatsApp' },
    { key: 'sms_landing', label: 'Com link para portal de negociação' },
    { key: 'sms_imagem', label: 'Com imagem da fatura' },
  ]},
  { section: 'WhatsApp', fields: [
    { key: 'whats_ativo', label: 'Ativo (notificação)' },
    { key: 'whats_receptivo', label: 'Receptivo (Bot/IA)' },
    { key: 'voicebot', label: 'IA de Voz' },
    { key: 'voz_humana', label: 'Telecobrança Humana' },
    { key: 'chatbot', label: 'Chatbot de negociação' },
  ]},
  { section: 'Canais Digitais', fields: [
    { key: 'rcs', label: 'RCS Conversacional' },
    { key: 'email', label: 'E-mail Transacional' },
    { key: 'enriquecimento', label: 'Enriquecimento de Base' },
  ]},
  { section: 'ONE', fields: [
    { key: 'email_fatura', label: 'E-mail com Fatura (volume)' },
    { key: 'imagem_fatura', label: 'Imagem da Fatura (volume)' },
  ]},
  { section: 'Outros Canais', fields: [
    { key: 'google_meta_ads', label: 'Google / Meta Ads' },
    { key: 'cartas_fisico', label: 'Cartas / Físico' },
  ]},
]

const CANAL_LABEL = {
  one_platform: 'ONE Platform', email: 'E-mail Transacional',
  email_fatura: 'E-mail Fatura', imagem_fatura: 'Imagem Fatura',
  sms_texto: 'SMS Texto', sms_whats: 'SMS WhatsApp',
  sms_landing: 'SMS Landing', sms_imagem: 'SMS Imagem',
  whats_ativo_mt: 'WhatsApp Ativo (MT)', whats_ativo_mo: 'WhatsApp Ativo (MO)',
  whats_receptivo: 'WhatsApp Receptivo', rcs: 'RCS',
  enriquecimento: 'Enriquecimento', chatbot: 'Chatbot',
  voicebot: 'Voicebot', voz_humana: 'Telecobrança Humana',
  google_meta_ads: 'Google / Meta Ads', cartas_fisico: 'Cartas / Físico',
  consulta_whatsapp: 'Consulta WhatsApp',
}

export default function Page() {
  const [step, setStep] = useState('discovery')
  const [discovery, setDiscovery] = useState(DISCOVERY_INITIAL)
  const [form, setForm] = useState(INITIAL)
  const result = useMemo(() => calcular(form), [form])

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const reset = () => setForm(INITIAL)

  const handleDownloadPDF = async () => {
    const html = buildSummaryHTML(discovery, result, form, formatMoney, formatPct)
    const pdf = await generatePDF(html)
    pdf.save('proposta-pgmais.pdf')
  }

  const handleDiscoverySubmit = () => {
    setStep('calculator')
    setForm(p => ({
      ...INITIAL,
      cpfs: parseFloat(discovery.cpfs) || INITIAL.cpfs,
      faturas: parseFloat(discovery.faturas) || INITIAL.faturas,
    }))
  }

  const t = useMemo(() => {
    if (!result) return null
    const o = result.orcamentos
    const c = result.categorias
    const e = result.entrada
    const vlrOneEmail = o.one_platform + o.email_fatura
    return {
      vlrOneEmail,
      porFatura: e.faturas > 0 ? vlrOneEmail / e.faturas : 0,
      reguaTotal: c.sms + c.digital,
      porCpfRegua: e.cpfs > 0 ? (c.sms + c.digital) / e.cpfs : 0,
      porCpfTotal: e.cpfs > 0 ? c.total / e.cpfs : 0,
    }
  }, [result])

  const rowsSuperior = useMemo(() => [
    { prod: 'ONE (CPFs)', unit: result.entrada.cpfs > 0 ? result.plano_one.total_mensal / result.entrada.cpfs : 0, qtd: result.entrada.cpfs, tot: result.plano_one.total_mensal },
    { prod: 'QTD FATURAS', unit: null, qtd: result.entrada.faturas, tot: null },
    { prod: 'EMAIL FATURA', unit: result.precos.email_fatura, qtd: result.volumes.email_fatura, tot: result.orcamentos.email_fatura },
    { prod: 'IMAGEM FATURA', unit: result.precos.imagem_fatura, qtd: result.volumes.imagem_fatura, tot: result.orcamentos.imagem_fatura },
  ], [result])

  const rowsPreventiva = useMemo(() => [
    { prod: 'SMS', unit: result.precos.sms, qtd: result.smsTotal, tot: result.orcamentos.sms_texto + result.orcamentos.sms_whats + result.orcamentos.sms_landing + result.orcamentos.sms_imagem },
    { prod: 'RCS Basic', unit: result.precos.rcs, qtd: result.volumes.rcs, tot: result.orcamentos.rcs },
    { prod: 'WHATS ATIVO', unit: result.precos.whatsapp_mt, qtd: result.volumes.whats_ativo, tot: result.orcamentos.whats_ativo_mt },
    { prod: 'WHATS RECEPTIVO', unit: 0, qtd: result.volumes.whats_receptivo, tot: result.orcamentos.whats_receptivo },
    { prod: 'ENRIQUECIMENTO', unit: result.precos.enriquecimento, qtd: result.volumes.enriquecimento, tot: result.orcamentos.enriquecimento },
    { prod: 'CHATBOT', unit: result.precos.chatbot, qtd: result.volumes.chatbot, tot: result.orcamentos.chatbot },
    { prod: 'VOICEBOT', unit: result.precos.voicebot, qtd: result.volumes.voicebot, tot: result.orcamentos.voicebot },
    { prod: 'SMS LANDING PAGE', unit: result.precos.sms, qtd: result.volumes.sms_landing, tot: result.orcamentos.sms_landing },
  ], [result])

  const total = result.categorias.total

  const StepIndicator = () => (
    <div className="step-indicator">
      <div className={`step-item ${step === 'discovery' ? 'active' : 'done'}`} onClick={() => setStep('discovery')}>
        <div className="step-number">{step === 'calculator' ? '✓' : '1'}</div>
        <div className="step-label">Discovery</div>
      </div>
      <div className="step-line" />
      <div className={`step-item ${step === 'calculator' ? 'active' : ''}`}>
        <div className="step-number">2</div>
        <div className="step-label">Calculadora</div>
      </div>
    </div>
  )

  if (step === 'discovery') {
    return (
      <div className="container">
        <div className="header">
          <div className="header-icon">P</div>
          <div>
            <h1>Precificação Comercial</h1>
            <span className="sub">Roteiro de Discovery — Pré-Proposta</span>
          </div>
        </div>
        <StepIndicator />
        <DiscoveryForm
          data={discovery}
          onChange={setDiscovery}
          onSubmit={handleDiscoverySubmit}
        />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-icon">P</div>
        <div>
          <h1>Precificação Comercial</h1>
          <span className="sub">Tabela de Preços Maio 2026 — Preencha os volumes e veja o orçamento</span>
        </div>
      </div>
      <StepIndicator />

      <div className="card card-full send-card">
        <div className="card-title">📥 Baixar Proposta</div>
        <div className="send-row">
          <button className="btn" onClick={handleDownloadPDF}>
            ⬇ Baixar PDF
          </button>
        </div>
      </div>

      <button className="btn btn-secondary btn-sm" onClick={() => setStep('discovery')} style={{ marginBottom: 16 }}>
        ← Voltar ao Discovery
      </button>

      <div className="grid">
        {FIELDS.filter(g => g.section === 'Base' || discovery.canais_ativos.includes(g.section)).map(g => (
          <div key={g.section} className={`card ${g.full ? 'card-full' : ''}`}>
            <div className="card-title">{g.section}</div>
            <div className={g.cols === 2 ? 'field-row' : ''}>
              {g.fields.map(f => (
                <div key={f.key} className="field-group">
                  <label>{f.label}</label>
                  <input
                    type="number"
                    value={form[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="card card-full actions">
          <button className="btn" onClick={reset}>Carregar Exemplo</button>
        </div>
      </div>

      <div className="results-section">
        <div className="kpi-grid">
          <div className="kpi-card dark">
            <div className="kpi-label">Total Geral</div>
            <div className="kpi-value">{formatMoney(total)}</div>
            <div className="kpi-sub">por CPF: {formatMoney(t.porCpfTotal)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Categoria ONE</div>
            <div className="kpi-value">{formatMoney(result.categorias.one)}</div>
            <div className="kpi-sub">{formatPct(result.categorias.one / total * 100)} do total</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Categoria SMS</div>
            <div className="kpi-value">{formatMoney(result.categorias.sms)}</div>
            <div className="kpi-sub">{formatPct(result.categorias.sms / total * 100)} do total</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Categoria Digital</div>
            <div className="kpi-value">{formatMoney(result.categorias.digital)}</div>
            <div className="kpi-sub">{formatPct(result.categorias.digital / total * 100)} do total</div>
          </div>
        </div>

        <div className="cat-bar">
          <div className="cat-bar-segment" style={{ width: `${result.categorias.one / total * 100}%`, background: '#1E4620' }}>
            {result.categorias.one > 0 && formatPct(result.categorias.one / total * 100)}
          </div>
          <div className="cat-bar-segment" style={{ width: `${result.categorias.sms / total * 100}%`, background: '#172c66' }}>
            {result.categorias.sms > 0 && formatPct(result.categorias.sms / total * 100)}
          </div>
          <div className="cat-bar-segment" style={{ width: `${result.categorias.digital / total * 100}%`, background: '#0120eb' }}>
            {result.categorias.digital > 0 && formatPct(result.categorias.digital / total * 100)}
          </div>
        </div>

        <div className="section-title">Orçamento por Canal</div>
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Produto</th><th className="num">VLR Unit. PG</th><th className="num">QTD</th><th className="num">Total</th><th className="num">%</th></tr></thead>
            <tbody>
              {rowsSuperior.map(item => (
                <tr key={item.prod}>
                  <td>{item.prod}</td>
                  <td className="num">{item.unit !== null ? formatMoney(item.unit) : '-'}</td>
                  <td className="num">{item.qtd.toLocaleString('pt-BR')}</td>
                  <td className="num">{item.tot !== null ? formatMoney(item.tot) : '-'}</td>
                  <td className="num">{item.tot ? formatPct(item.tot / total * 100) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title">Canais Estratégia Preventiva</div>
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Produto</th><th className="num">VLR Unit. PG</th><th className="num">QTD</th><th className="num">Total</th><th className="num">%</th></tr></thead>
            <tbody>
              {rowsPreventiva.map(item => (
                <tr key={item.prod}>
                  <td>{item.prod}</td>
                  <td className="num">{formatMoney(item.unit)}</td>
                  <td className="num">{item.qtd.toLocaleString('pt-BR')}</td>
                  <td className="num">{formatMoney(item.tot)}</td>
                  <td className="num">{formatPct(item.tot / total * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="kpi-grid" style={{ marginTop: 20 }}>
          <div className="kpi-card dark">
            <div className="kpi-label">ONE + E-MAIL FATURA</div>
            <div className="kpi-value">{formatMoney(t.vlrOneEmail)}</div>
            <div className="kpi-sub">por fatura: {formatMoney(t.porFatura)}</div>
          </div>
          <div className="kpi-card dark">
            <div className="kpi-label">RÉGUA PREVENTIVA CANAIS</div>
            <div className="kpi-value">{formatMoney(t.reguaTotal)}</div>
            <div className="kpi-sub">por CPF: {formatMoney(t.porCpfRegua)}</div>
          </div>
          <div className="kpi-card dark">
            <div className="kpi-label">TOTAL GERAL</div>
            <div className="kpi-value">{formatMoney(total)}</div>
            <div className="kpi-sub">por CPF: {formatMoney(t.porCpfTotal)}</div>
          </div>
        </div>

        <div className="section-title">Distribuição Percentual</div>
        <div className="card">
          <div className="percent-list">
            {Object.entries(result.orcamentos)
              .sort(([, a], [, b]) => b - a)
              .filter(([, val]) => val > 0)
              .map(([key, val]) => (
                <div key={key} className="percent-item">
                  <span className="label">{CANAL_LABEL[key] || key}</span>
                  <span className="value">{result.percentuais[key]}%</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
