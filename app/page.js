'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { calcular, formatMoney, formatMoneyPreciso, formatPct, getSetups } from '@/lib/precificacao'
import { getCampos } from '@/lib/proposta'
import { CANAIS } from '@/lib/canais'
import { useConfig } from '@/lib/ConfigContext'
import DiscoveryForm from '@/components/DiscoveryForm'

const DISCOVERY_INITIAL = {
  nomeCliente: '', numeroProposta: '',
  cpfs: '', faturas: '', pct_adimplentes: '',
  tx_recup_30: '', tx_recup_60: '', tx_recup_90: '',
  tipo_cliente: '', objetivo: '',
  tem_automacao: '', sistema_dividas: '', direcionamento: '',
  canais_falha: [], canais_ativos: [], qualidade_dados: '',
  api_carga: false, api_consulta: false, api_boleto: false,
  sla_cargas: '', broker: '',
}

const INITIAL = {
  cpfs: 0, faturas: 0,
  sms_texto: 0,
  sms_fast_otp: 0, sms_rota_exclusiva: 0, sms_sender_id: 0, sms_flash: 0,
  whats_ativo: 0, whats_receptivo: 0,
  voicebot: 0, rcs: 0, rcs_basico: 0, rcs_simples: 0, email: 0,
  email_transacional: 0,
  email_registrado: 0, email_smtp: 0, email_pdf: 0,
  chatbot: 0, enriquecimento: 0, valida_mais: 0, enriquecimento_premium: 0,
  google_meta_ads: 0, cartas_fisico: 0,
  omni_plano: '', omni_conversas: 0, telegrama: 0, carne: 0, cartorio_documento: 0, documento_digital: 0,
  landing_page_link: 0, portal_negociacao: 0,
  one_modelo: 'Enterprise',
  kami_robo_localizacao: 0, kami_robo_negociacao: 0, kami_texto: 0,
  whats_mobile_mt: 0, whats_mobile_mo: 0,
  smart_contact_phone_score: 0, smart_contact_phone_enriquecimento: 0,
  smart_contact_email_score: 0, smart_contact_email_enriquecimento: 0,
}

const ONE_MODELOS = ['Enterprise', 'Pro']

const OMNI_PLANOS = ['Starter', 'Pro', 'Business', 'Enterprise']

function ConfigLink() {
  return (
    <Link href="/config" className="btn btn-secondary btn-sm btn-config">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="btn-config-icon">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
      Configurações
    </Link>
  )
}

const FIELDS = [
  { section: 'Base', full: true, cols: 2, fields: [
    { key: 'cpfs', label: 'Volume total de CPFs/CNPJs ativos' },
    { key: 'faturas', label: 'Volume total de faturas/cartões mensais' },
  ]},
  { section: 'ONE Platform', fields: [
    { key: 'one_modelo', gateKey: 'one_platform', label: 'Modelo (acima do limite do Plus)', type: 'select', options: ONE_MODELOS },
  ]},
  { section: 'SMS', cols: 2, fields: [
    { key: 'sms_texto', label: 'Texto Padrão (Simples)' },
    { key: 'sms_fast_otp', label: 'FAST/OTP (transacional)' },
    { key: 'sms_rota_exclusiva', label: 'Rota Exclusiva' },
    { key: 'sms_sender_id', label: 'Sender ID' },
    { key: 'sms_flash', label: 'Flash (TIM/Claro)' },
  ]},
  { section: 'WhatsApp', fields: [
    { key: 'whats_ativo', label: 'Ativo (disparo em massa)' },
    { key: 'whats_receptivo', label: 'Receptivo (Bot/IA)' },
    { key: 'voicebot', label: 'IA de Voz (Voicebot — nº de robôs)' },
    { key: 'chatbot', label: 'Chatbot de negociação (atendimentos)' },
  ]},
  { section: 'Email', fields: [
    { key: 'email', label: 'E-mail Simples' },
    { key: 'email_transacional', label: 'E-mail Transacional (volume do pacote mensal)' },
    { key: 'email_registrado', label: 'E-mail Registrado (AR Digital)' },
    { key: 'email_smtp', label: 'E-mail SMTP (volume do pacote)' },
    { key: 'email_pdf', label: 'E-mail em PDF (qtd. gerada)' },
  ]},
  { section: 'Canais Digitais', fields: [
    { key: 'rcs', label: 'RCS Conversacional/Sessão' },
    { key: 'rcs_basico', label: 'RCS Básico' },
    { key: 'rcs_simples', label: 'RCS Simples' },
    { key: 'enriquecimento', label: 'Enriquecimento de Base' },
    { key: 'valida_mais', label: 'Valida+ (consultas)' },
    { key: 'enriquecimento_premium', label: 'Enriquecimento Premium (consultas)' },
    { key: 'omni_plano', gateKey: 'omni_conversas', label: 'Plataforma OMNI — plano contratado', type: 'select', options: OMNI_PLANOS },
    { key: 'omni_conversas', label: 'Plataforma OMNI (conversas/mês)' },
  ]},
  { section: 'Kami', fields: [
    { key: 'kami_robo_localizacao', label: 'Robô Localização (nº de robôs)' },
    { key: 'kami_robo_negociacao', label: 'Robô Negociação (nº de robôs)' },
    { key: 'kami_texto', label: 'Kami Texto (mensagens/mês)' },
  ]},
  { section: 'WhatsApp Mobile', fields: [
    { key: 'whats_mobile_mt', gateKey: 'whats_mobile', label: 'MT — mensagens enviadas pela empresa' },
    { key: 'whats_mobile_mo', gateKey: 'whats_mobile', label: 'MO — sessões iniciadas pelo cliente' },
  ]},
  { section: 'Smart Contact', fields: [
    { key: 'smart_contact_phone_score', label: 'Phone — Score (consultas)' },
    { key: 'smart_contact_phone_enriquecimento', label: 'Phone — Enriquecimento + Score (consultas)' },
    { key: 'smart_contact_email_score', label: 'Email — Score (consultas)' },
    { key: 'smart_contact_email_enriquecimento', label: 'Email — Enriquecimento + Score (consultas)' },
  ]},
  { section: 'Outros Canais', fields: [
    { key: 'google_meta_ads', label: 'Google / Meta Ads (campanha — CPF/Email)' },
    { key: 'cartas_fisico', label: 'Cartas / Físico' },
    { key: 'telegrama', label: 'Telegrama' },
    { key: 'carne', label: 'Carnê' },
    { key: 'cartorio_documento', label: 'Cartório' },
    { key: 'documento_digital', label: 'Documentos Digital/Files/Link' },
    { key: 'landing_page_link', label: 'Landing Page (links enviados)' },
    { key: 'portal_negociacao', label: 'Portal de Negociação (licenças)' },
  ]},
]

const CANAL_LABEL = {
  one_platform: 'ONE Platform', email: 'E-mail Simples',
  email_transacional: 'E-mail Transacional',
  sms_texto: 'SMS Texto',
  sms_fast_otp: 'SMS FAST/OTP', sms_rota_exclusiva: 'SMS Rota Exclusiva',
  sms_sender_id: 'SMS Sender ID', sms_flash: 'SMS Flash',
  whats_ativo: 'WhatsApp Ativo', whats_receptivo: 'WhatsApp Receptivo',
  rcs: 'RCS Conversacional/Sessão', rcs_basico: 'RCS Básico', rcs_simples: 'RCS Simples',
  enriquecimento: 'Enriquecimento',
  valida_mais: 'Valida+', enriquecimento_premium: 'Enriquecimento Premium',
  chatbot: 'Chatbot', voicebot: 'Voicebot',
  google_meta_ads: 'Google / Meta Ads', cartas_fisico: 'Cartas / Físico',
  omni: 'Plataforma OMNI', telegrama: 'Telegrama', carne: 'Carnê',
  cartorio_documento: 'Cartório', documento_digital: 'Documentos Digital/Files/Link',
  landing_page_link: 'Landing Page', portal_negociacao: 'Portal de Negociação',
  email_registrado: 'E-mail Registrado (AR Digital)', email_smtp: 'E-mail SMTP',
  email_pdf: 'E-mail em PDF',
  telecobranca_voice_ai: 'Telecobrança - Voice AI',
  telecobranca_cross_channel: 'Telecobrança - Cross Channel AI',
  telecobranca_expert_human: 'Telecobrança - Expert Human',
  kami_robo_localizacao: 'Kami Voz — Robô Localização',
  kami_robo_negociacao: 'Kami Voz — Robô Negociação',
  kami_texto: 'Kami Texto',
  whats_mobile: 'WhatsApp Mobile',
  smart_contact_phone_score: 'Smart Contact Phone — Score',
  smart_contact_phone_enriquecimento: 'Smart Contact Phone — Enriquecimento + Score',
  smart_contact_email_score: 'Smart Contact Email — Score',
  smart_contact_email_enriquecimento: 'Smart Contact Email — Enriquecimento + Score',
}

const CANAL_ATIVO_LABEL = Object.fromEntries(CANAIS.map(({ key, label }) => [key, label]))

export default function Page() {
  const { config } = useConfig()
  const [step, setStep] = useState('discovery')
  const [discovery, setDiscovery] = useState(DISCOVERY_INITIAL)
  const [form, setForm] = useState(INITIAL)
  const result = useMemo(() => calcular(form, discovery.canais_ativos, config), [form, discovery.canais_ativos, config])

  const update = (key, val) => {
    const num = parseFloat(val)
    const clamped = (val === '' || isNaN(num) || num >= 0) ? val : '0'
    setForm(p => ({ ...p, [key]: clamped }))
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

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
    const vlrOneEmail = o.one_platform + o.email_transacional
    return {
      vlrOneEmail,
      porFatura: e.faturas > 0 ? vlrOneEmail / e.faturas : 0,
      reguaTotal: c.sms + c.digital,
      porCpfRegua: e.cpfs > 0 ? (c.sms + c.digital) / e.cpfs : 0,
      porCpfTotal: e.cpfs > 0 ? c.total / e.cpfs : 0,
    }
  }, [result])

  const ativo = (canal) => discovery.canais_ativos.includes(canal)

  const rowsSuperior = useMemo(() => [
    ativo('one_platform') && { prod: 'ONE (CPFs)', unit: result.entrada.cpfs > 0 ? result.plano_one.total_mensal / result.entrada.cpfs : 0, qtd: result.entrada.cpfs, tot: result.plano_one.total_mensal },
    { prod: 'QTD FATURAS', unit: null, qtd: result.entrada.faturas, tot: null },
    ativo('email_transacional') && { prod: 'EMAIL TRANSACIONAL', unit: result.precos.email_transacional, qtd: result.volumes.email_transacional, tot: result.orcamentos.email_transacional },
    ativo('omni_conversas') && { prod: `PLATAFORMA OMNI${result.plano_omni.nome ? ` (${result.plano_omni.nome})` : ''}`, unit: result.volumes.omni_conversas > 0 ? result.plano_omni.total_mensal / result.volumes.omni_conversas : 0, qtd: result.volumes.omni_conversas, tot: result.plano_omni.total_mensal },
    ativo('telecobranca_voice_ai') && { prod: `TELECOBRANÇA VOICE AI (${result.plano_telecobranca.pa} PA)`, unit: result.entrada.cpfs > 0 ? result.plano_telecobranca.voice_ai / result.entrada.cpfs : 0, qtd: result.entrada.cpfs, tot: result.plano_telecobranca.voice_ai },
    ativo('telecobranca_cross_channel') && { prod: `TELECOBRANÇA CROSS CHANNEL AI (${result.plano_telecobranca.pa} PA)`, unit: result.entrada.cpfs > 0 ? result.plano_telecobranca.cross_channel / result.entrada.cpfs : 0, qtd: result.entrada.cpfs, tot: result.plano_telecobranca.cross_channel },
    ativo('telecobranca_expert_human') && { prod: 'TELECOBRANÇA EXPERT HUMAN (sob consulta)', unit: 0, qtd: result.entrada.cpfs, tot: 0 },
    ativo('kami_texto') && { prod: 'KAMI TEXTO (pacote)', unit: result.precos.kami_texto, qtd: result.volumes.kami_texto, tot: result.orcamentos.kami_texto },
  ].filter(Boolean).filter(item => item.tot === null || item.tot > 0), [result, discovery.canais_ativos])

  const rowsPreventiva = useMemo(() => [
    ativo('sms_texto') && { prod: 'SMS', unit: result.precos.sms, qtd: result.smsTotal, tot: result.orcamentos.sms_texto },
    ativo('sms_fast_otp') && { prod: 'SMS FAST/OTP', unit: result.precos.sms_fast_otp, qtd: result.volumes.sms_fast_otp, tot: result.orcamentos.sms_fast_otp },
    ativo('sms_rota_exclusiva') && { prod: 'SMS ROTA EXCLUSIVA', unit: result.precos.sms_rota_exclusiva, qtd: result.volumes.sms_rota_exclusiva, tot: result.orcamentos.sms_rota_exclusiva },
    ativo('sms_sender_id') && { prod: 'SMS SENDER ID', unit: result.precos.sms_sender_id, qtd: result.volumes.sms_sender_id, tot: result.orcamentos.sms_sender_id },
    ativo('sms_flash') && { prod: 'SMS FLASH', unit: result.precos.sms_flash, qtd: result.volumes.sms_flash, tot: result.orcamentos.sms_flash },
    ativo('rcs') && { prod: 'RCS Conversacional/Sessão', unit: result.precos.rcs, qtd: result.volumes.rcs, tot: result.orcamentos.rcs },
    ativo('rcs_basico') && { prod: 'RCS BÁSICO', unit: result.precos.rcs_basico, qtd: result.volumes.rcs_basico, tot: result.orcamentos.rcs_basico },
    ativo('rcs_simples') && { prod: 'RCS SIMPLES', unit: result.precos.rcs_simples, qtd: result.volumes.rcs_simples, tot: result.orcamentos.rcs_simples },
    ativo('whats_ativo') && { prod: 'WHATS ATIVO', unit: result.precos.whats_ativo, qtd: result.volumes.whats_ativo, tot: result.orcamentos.whats_ativo },
    ativo('whats_receptivo') && { prod: 'WHATS RECEPTIVO', unit: result.precos.whats_receptivo, qtd: result.volumes.whats_receptivo, tot: result.orcamentos.whats_receptivo },
    ativo('enriquecimento') && { prod: 'ENRIQUECIMENTO', unit: result.precos.enriquecimento, qtd: result.volumes.enriquecimento, tot: result.orcamentos.enriquecimento },
    ativo('valida_mais') && { prod: 'VALIDA+', unit: result.precos.valida_mais, qtd: result.volumes.valida_mais, tot: result.orcamentos.valida_mais },
    ativo('enriquecimento_premium') && { prod: 'ENRIQUECIMENTO PREMIUM', unit: result.precos.enriquecimento_premium, qtd: result.volumes.enriquecimento_premium, tot: result.orcamentos.enriquecimento_premium },
    ativo('chatbot') && { prod: 'CHATBOT', unit: result.precos.chatbot, qtd: result.volumes.chatbot, tot: result.orcamentos.chatbot },
    ativo('voicebot') && { prod: 'VOICEBOT', unit: result.precos.voicebot, qtd: result.volumes.voicebot, tot: result.orcamentos.voicebot },
    ativo('kami_robo_localizacao') && { prod: 'KAMI VOZ — ROBÔ LOCALIZAÇÃO', unit: result.precos.kami_robo_localizacao, qtd: result.volumes.kami_robo_localizacao, tot: result.orcamentos.kami_robo_localizacao },
    ativo('kami_robo_negociacao') && { prod: 'KAMI VOZ — ROBÔ NEGOCIAÇÃO', unit: result.precos.kami_robo_negociacao, qtd: result.volumes.kami_robo_negociacao, tot: result.orcamentos.kami_robo_negociacao },
    ativo('whats_mobile') && { prod: 'WHATSAPP MOBILE', unit: result.precos.whats_mobile, qtd: result.volumes.whats_mobile_mt + result.volumes.whats_mobile_mo, tot: result.orcamentos.whats_mobile },
    ativo('smart_contact_phone_score') && { prod: 'SMART CONTACT PHONE — SCORE', unit: result.precos.smart_contact_phone_score, qtd: result.volumes.smart_contact_phone_score, tot: result.orcamentos.smart_contact_phone_score },
    ativo('smart_contact_phone_enriquecimento') && { prod: 'SMART CONTACT PHONE — ENRIQUECIMENTO + SCORE', unit: result.precos.smart_contact_phone_enriquecimento, qtd: result.volumes.smart_contact_phone_enriquecimento, tot: result.orcamentos.smart_contact_phone_enriquecimento },
    ativo('smart_contact_email_score') && { prod: 'SMART CONTACT EMAIL — SCORE', unit: result.precos.smart_contact_email_score, qtd: result.volumes.smart_contact_email_score, tot: result.orcamentos.smart_contact_email_score },
    ativo('smart_contact_email_enriquecimento') && { prod: 'SMART CONTACT EMAIL — ENRIQUECIMENTO + SCORE', unit: result.precos.smart_contact_email_enriquecimento, qtd: result.volumes.smart_contact_email_enriquecimento, tot: result.orcamentos.smart_contact_email_enriquecimento },
    ativo('email_registrado') && { prod: 'EMAIL REGISTRADO (AR DIGITAL)', unit: result.precos.email_registrado, qtd: result.volumes.email_registrado, tot: result.orcamentos.email_registrado },
    ativo('email_smtp') && { prod: 'EMAIL SMTP', unit: result.precos.email_smtp, qtd: result.volumes.email_smtp, tot: result.orcamentos.email_smtp },
    ativo('email_pdf') && { prod: 'EMAIL PDF', unit: result.precos.email_pdf, qtd: result.volumes.email_pdf, tot: result.orcamentos.email_pdf },
    ativo('google_meta_ads') && { prod: 'GOOGLE / META ADS', unit: result.precos.google_meta_ads, qtd: result.volumes.google_meta_ads, tot: result.orcamentos.google_meta_ads },
    ativo('landing_page_link') && { prod: 'LANDING PAGE', unit: result.precos.landing_page_link, qtd: result.volumes.landing_page_link, tot: result.orcamentos.landing_page_link },
    ativo('portal_negociacao') && { prod: 'PORTAL DE NEGOCIAÇÃO', unit: result.precos.portal_negociacao, qtd: result.volumes.portal_negociacao, tot: result.orcamentos.portal_negociacao },
    ativo('telegrama') && { prod: 'TELEGRAMA', unit: result.precos.telegrama, qtd: result.volumes.telegrama, tot: result.orcamentos.telegrama },
    ativo('carne') && { prod: 'CARNÊ', unit: result.precos.carne, qtd: result.volumes.carne, tot: result.orcamentos.carne },
    ativo('cartorio_documento') && { prod: 'CARTÓRIO', unit: result.precos.cartorio_documento, qtd: result.volumes.cartorio_documento, tot: result.orcamentos.cartorio_documento },
    ativo('documento_digital') && { prod: 'DOCUMENTOS DIGITAL/FILES/LINK', unit: result.precos.documento_digital, qtd: result.volumes.documento_digital, tot: result.orcamentos.documento_digital },
  ].filter(Boolean).filter(item => item.tot > 0), [result, discovery.canais_ativos])

  const setups = useMemo(() => getSetups(discovery.canais_ativos, result.plano_one, config), [result, discovery.canais_ativos, config])

  const total = result.categorias.total

  const [gerando, setGerando] = useState(false)
  const [erroGeracao, setErroGeracao] = useState('')

  const campos = useMemo(() => getCampos(result, discovery, config), [result, discovery, config])
  const gruposCampos = useMemo(() => {
    const map = new Map()
    campos.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group).push(c)
    })
    return [...map.entries()]
  }, [campos])
  const [overrideValues, setOverrideValues] = useState({})

  useEffect(() => {
    if (step === 'editor') {
      setOverrideValues(Object.fromEntries(campos.map((c) => [c.id, c.value])))
    }
  }, [step])

  const gerarProposta = async () => {
    setGerando(true)
    setErroGeracao('')
    try {
      const resp = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, discovery, config, overrides: overrideValues }),
      })
      if (!resp.ok) throw new Error(await resp.text())
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Proposta - ${discovery.nomeCliente || 'Cliente'}.pptx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setErroGeracao(`Não foi possível gerar a proposta: ${err.message || err}`)
    } finally {
      setGerando(false)
    }
  }

  const StepIndicator = () => (
    <div className="step-indicator">
      <div className={`step-item ${step === 'discovery' ? 'active' : 'done'}`} onClick={() => setStep('discovery')}>
        <div className="step-number">{step !== 'discovery' ? '✓' : '1'}</div>
        <div className="step-label">Discovery</div>
      </div>
      <div className="step-line" />
      <div className={`step-item ${step === 'calculator' ? 'active' : (step === 'proposta' || step === 'editor') ? 'done' : ''}`} onClick={() => setStep('calculator')}>
        <div className="step-number">{(step === 'proposta' || step === 'editor') ? '✓' : '2'}</div>
        <div className="step-label">Calculadora</div>
      </div>
      <div className="step-line" />
      <div className={`step-item ${(step === 'proposta' || step === 'editor') ? 'active' : ''}`}>
        <div className="step-number">3</div>
        <div className="step-label">Proposta</div>
      </div>
    </div>
  )

  if (step === 'discovery') {
    return (
      <div className="container">
        <div className="header">
          <div className="header-main">
            <div className="header-icon">P</div>
            <div>
              <h1>Precificação Comercial</h1>
              <span className="sub">Roteiro de Discovery — Pré-Proposta</span>
            </div>
          </div>
          <ConfigLink />
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

  if (step === 'proposta') {
    return (
      <div className="container">
        <div className="header">
          <div className="header-main">
            <div className="header-icon">P</div>
            <div>
              <h1>Precificação Comercial</h1>
              <span className="sub">Geração da Proposta Comercial (PPTX)</span>
            </div>
          </div>
          <ConfigLink />
        </div>
        <StepIndicator />

        <button className="btn btn-secondary btn-sm" onClick={() => setStep('calculator')} style={{ marginBottom: 16 }}>
          ← Voltar à Calculadora
        </button>

        <div className="card card-full">
          <div className="card-title">Gerar Proposta</div>
          <p style={{ marginBottom: 16, color: '#555' }}>
            A proposta é gerada de forma condicional: só entram os slides dos produtos marcados como ativos no Discovery, com os valores calculados preenchidos automaticamente.
          </p>
          <div className="percent-list" style={{ marginBottom: 16 }}>
            {discovery.canais_ativos.map(canal => (
              <div key={canal} className="percent-item">
                <span className="label">{CANAL_ATIVO_LABEL[canal] || canal}</span>
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => setStep('editor')}>
            Revisar e Editar →
          </button>
        </div>
      </div>
    )
  }

  if (step === 'editor') {
    return (
      <div className="container">
        <div className="header">
          <div className="header-main">
            <div className="header-icon">P</div>
            <div>
              <h1>Precificação Comercial</h1>
              <span className="sub">Revisão do Conteúdo da Proposta</span>
            </div>
          </div>
          <ConfigLink />
        </div>
        <StepIndicator />

        <button className="btn btn-secondary btn-sm" onClick={() => setStep('proposta')} style={{ marginBottom: 16 }}>
          ← Voltar
        </button>

        <div className="card card-full">
          <div className="card-title">Revisar Conteúdo da Proposta</div>
          <p style={{ color: '#555' }}>
            Os valores abaixo já vêm calculados a partir da Calculadora. Ajuste o que precisar antes de gerar o arquivo — o botão "↺" restaura o valor calculado.
          </p>
        </div>

        <div className="grid">
          {gruposCampos.map(([grupo, camposDoGrupo]) => (
            <div key={grupo} className="card">
              <div className="card-title">{grupo}</div>
              {camposDoGrupo.map((c) => (
                <div key={c.id} className="field-group">
                  <label>{c.label}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={overrideValues[c.id] ?? ''}
                      onChange={(e) => setOverrideValues((p) => ({ ...p, [c.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Restaurar valor calculado"
                      onClick={() => setOverrideValues((p) => ({ ...p, [c.id]: c.value }))}
                    >
                      ↺
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
          Não editável nesta versão: tabela de referência de Cartas/Físico (slide 33) e textos fixos do template.
        </p>

        <div className="card card-full actions">
          <button className="btn" onClick={gerarProposta} disabled={gerando}>
            {gerando ? 'Gerando...' : 'Gerar Proposta (PPTX)'}
          </button>
          {erroGeracao && <p style={{ color: '#c0392b', marginTop: 12 }}>{erroGeracao}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-main">
          <div className="header-icon">P</div>
          <div>
            <h1>Precificação Comercial</h1>
            <span className="sub">Tabela de Preços Maio 2026 — Preencha os volumes e veja o orçamento</span>
          </div>
        </div>
        <ConfigLink />
      </div>
      <StepIndicator />

      <button className="btn btn-secondary btn-sm" onClick={() => setStep('discovery')} style={{ marginBottom: 16 }}>
        ← Voltar ao Discovery
      </button>

      <div className="grid">
        {FIELDS.map(g => {
          const visibleFields = g.section === 'Base' ? g.fields : g.fields.filter(f => ativo(f.gateKey || f.key))
          if (visibleFields.length === 0) return null
          return (
            <div key={g.section} className={`card ${g.full ? 'card-full' : ''}`}>
              <div className="card-title">{g.section}</div>
              <div className={g.cols === 2 ? 'field-row' : ''}>
                {visibleFields.map(f => (
                  <div key={f.key} className="field-group">
                    <label>{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={form[f.key]} onChange={e => update(f.key, e.target.value)}>
                        <option value="">— Selecione —</option>
                        {f.options.map(opt => {
                          const value = typeof opt === 'string' ? opt : opt.value
                          const label = typeof opt === 'string' ? opt : opt.label
                          return <option key={value} value={value}>{label}</option>
                        })}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={form[f.key]}
                        onChange={e => update(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
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
                  <td className="num">{item.unit !== null ? formatMoneyPreciso(item.unit) : '-'}</td>
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
                  <td className="num">{formatMoneyPreciso(item.unit)}</td>
                  <td className="num">{item.qtd.toLocaleString('pt-BR')}</td>
                  <td className="num">{formatMoney(item.tot)}</td>
                  <td className="num">{formatPct(item.tot / total * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {setups.length > 0 && (
          <>
            <div className="section-title">Custos de Implantação (Únicos — não entram no total mensal)</div>
            <div className="card table-wrap">
              <table>
                <thead><tr><th>Item</th><th className="num">Valor</th></tr></thead>
                <tbody>
                  {setups.map(item => (
                    <tr key={item.label}>
                      <td>{item.label}</td>
                      <td className="num">{formatMoney(item.valor)}</td>
                    </tr>
                  ))}
                  <tr className="highlight-row">
                    <td>Total Setup</td>
                    <td className="num">{formatMoney(setups.reduce((s, i) => s + i.valor, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="kpi-grid" style={{ marginTop: 20 }}>
          <div className="kpi-card dark">
            <div className="kpi-label">ONE + E-MAIL TRANSACIONAL</div>
            <div className="kpi-value">{formatMoney(t.vlrOneEmail)}</div>
            <div className="kpi-sub">por fatura: {formatMoney(t.porFatura)}</div>
          </div>
          <div className="kpi-card dark">
            <div className="kpi-label">RÉGUA PREVENTIVA CANAIS</div>
            <div className="kpi-value">{formatMoney(t.reguaTotal)}</div>
            <div className="kpi-sub">por CPF: {formatMoney(t.porCpfRegua)}</div>
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

        <div className="card card-full actions">
          <button className="btn" onClick={() => setStep('proposta')}>
            Avançar para Proposta →
          </button>
        </div>
      </div>
    </div>
  )
}
