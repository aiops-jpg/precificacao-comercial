'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { calcular, formatMoney, formatMoneyPreciso, formatPct, getSetups } from '@/lib/precificacao'
import { getCampos, getMascaras, getSlidesDaProposta, getTextosFixos } from '@/lib/proposta'
import { CANAIS } from '@/lib/canais'
import { useConfig } from '@/lib/ConfigContext'
import DiscoveryForm from '@/components/DiscoveryForm'
import slideGeometry from '@/lib/slideGeometry.json'

const GEOMETRIA_POR_SHAPE = Object.fromEntries(slideGeometry.map((g) => [g.name, g]))

// Alguns placeholders do template (ex. "R$ XXX") quebram em 2 linhas e vazam um pouco pra fora
// da caixa nominal do shape (autofit desligado) — expande a área do input pra cobrir esse vazamento.
function expandirGeom(geom, padPct = 1.2) {
  return {
    leftPct: geom.leftPct - padPct,
    topPct: geom.topPct - padPct,
    widthPct: geom.widthPct + padPct * 2,
    heightPct: geom.heightPct + padPct * 2,
  }
}

// Largura do slide em pontos (10" = 720pt — igual ao emu()/EMU_POR_POL de lib/proposta.js) — usada
// pra converter o tamanho de fonte REAL do template (extraído via COM, em pt) pra `cqw` (% da
// largura do container), em vez de "chutar" o tamanho pela altura da caixa — isso ficava enorme em
// caixas altas com texto pequeno (ex: o setup do ONE Platform, caixa alta mas fonte de 22pt só).
const SLIDE_LARGURA_PT = 720
const SLIDE_ALTURA_PT = 405
function fontSizeCqw(geom, fallbackPt = 10) {
  return `${((geom.fontSize || fallbackPt) / SLIDE_LARGURA_PT * 100).toFixed(3)}cqw`
}

// Alguns shapes do template têm caixa MUITO maior (altura E largura) que o texto do campo
// precisa (ex: o "limite de conversas" do Voicebot é uma caixa de ~19% da altura do slide pra um
// número de 3 dígitos) — sem isso, o input estica pra caber a caixa inteira e o texto fica pequeno
// e colado no canto. Encolhe pro tamanho que o texto ATUAL realmente ocupa (com uma folga de
// leitura), centraliza verticalmente, e na largura respeita o alinhamento REAL do texto no
// template (`geom.align`) — um valor centralizado (ex: "R$ 0,15" no RCS) precisa encolher a
// largura mantendo o centro no mesmo lugar, senão metade do texto original vaza pra fora da
// caixa encolhida.
const FATOR_ALTURA_LINHA = 1.35
const FATOR_LARGURA_CARACTERE = 0.62 // largura média de 1 caractere, em múltiplos do font-size

// Placeholders "R$ XXX" (preços unitários do slide 20) quebram em 2 linhas no template (caixa
// estreita, autofit desligado) e a 2ª linha desenha ABAIXO do limite nominal do shape — a caixa
// real (altura de 1 linha) não cobre. Não encolhe a altura pra essas caixas: mantém a altura
// original (que já dá conta das 2 linhas do template) por cima da qual o valor final (1 linha) fica
// centralizado. É por SHAPE (não por campo) porque alguns desses campos (preco_valida_mais,
// preco_enriquecimento_ativo) reaparecem no slide 30 num card diferente, de 1 linha só — lá a caixa
// deve encolher normal, senão fica maior que os cards vizinhos (ex: Smart Contact).
const SEM_ENCOLHER_ALTURA = new Set([
  'Google Shape;792;p61', // preco_sms
  'Google Shape;788;p61', // preco_email
  'Google Shape;790;p61', // preco_email_registrado
  'Google Shape;807;p61', // preco_documento_digital
  'Google Shape;808;p61', // preco_cartorio_documento
  'Google Shape;802;p61', // preco_enriquecimento_ativo (slide 20)
  'Google Shape;811;p61', // preco_valida_mais (slide 20)
])

function ajustarCaixaInput(geom, valorTexto, shape) {
  let novaGeom = geom

  const alturaNatural = ((geom.fontSize || 10) / SLIDE_ALTURA_PT) * 100 * FATOR_ALTURA_LINHA
  if (alturaNatural < geom.heightPct && !SEM_ENCOLHER_ALTURA.has(shape)) {
    novaGeom = { ...novaGeom, topPct: novaGeom.topPct + (geom.heightPct - alturaNatural) / 2, heightPct: alturaNatural }
  }

  const nCaracteres = Math.max((valorTexto || '').length, 4)
  const larguraNatural = ((geom.fontSize || 10) / SLIDE_LARGURA_PT) * 100 * nCaracteres * FATOR_LARGURA_CARACTERE
  if (larguraNatural < geom.widthPct) {
    const folga = geom.widthPct - larguraNatural
    const novoLeft = geom.align === 'center' ? novaGeom.leftPct + folga / 2
      : geom.align === 'right' ? novaGeom.leftPct + folga
      : novaGeom.leftPct
    novaGeom = { ...novaGeom, leftPct: novoLeft, widthPct: larguraNatural }
  }

  return novaGeom
}

// Alguns campos editam só uma PALAVRA no meio de uma frase bem maior do mesmo shape (ex: chatbot_
// franquia troca só o "5.000" dentro de "Franquia mínima: R$ 5.000 por fluxo de diálogo") — a
// geometria do shape inteiro não serve pra posicionar o overlay, então esses poucos casos têm um
// recorte manual (fração aproximada de onde o valor cai dentro do texto original).
const AJUSTE_MANUAL_CAMPO = {
  chatbot_franquia: (geom) => ({
    ...geom,
    leftPct: geom.leftPct + geom.widthPct * 0.430,
    widthPct: geom.widthPct * 0.085,
  }),
  // "R$ XX.XXX" — prefixo pequeno + valor grande no mesmo shape, centralizados juntos. Medido por
  // análise de pixels do PNG exportado (contorno de tinta em shape647_crop_v2.png, já sem o "3 x "):
  // o bloco "XX.XXX" (fonte grande) ocupa de ~37.5% a ~67% da largura da caixa original do shape.
  one_setup: (geom) => ({
    ...geom,
    leftPct: geom.leftPct + geom.widthPct * 0.375,
    widthPct: geom.widthPct * 0.295,
  }),
  // "R$ 20.000" — mesmo padrão do one_setup (prefixo pequeno + valor grande, centralizados juntos).
  // Medido por análise de pixels (shape1097_crop.png): o bloco do valor ocupa de ~22% a ~92,4% da
  // largura da caixa original do shape.
  landing_valor_por_link: (geom) => ({
    ...geom,
    leftPct: geom.leftPct + geom.widthPct * 0.22,
    widthPct: geom.widthPct * 0.704,
  }),
}
function aplicarAjusteManual(campoId, geom) {
  const ajuste = AJUSTE_MANUAL_CAMPO[campoId]
  return ajuste ? ajuste(geom) : geom
}

// Ajustes finos pedidos na revisão de design, por cima do ajuste automático (ajustarCaixaInput):
// `altura`/`largura` são multiplicadores (0.84 = 16% menor, 1.02 = 2% maior); `centralizarH`
// recentraliza horizontalmente depois de mudar a largura.
const AJUSTE_FINO_CAMPO = {
  one_setup: { altura: 0.84 },
  voicebot_setup: { altura: 0.985, centralizarH: true },
  chatbot_setup: { altura: 0.985, centralizarH: true },
  chatbot_franquia: { largura: 0.99, centralizarH: true },
  landing_valor_por_link: { largura: 1.02, centralizarH: true },
}
function aplicarAjusteFino(campoId, geom) {
  const ajuste = AJUSTE_FINO_CAMPO[campoId]
  if (!ajuste) return geom
  let novaGeom = geom
  if (ajuste.altura) {
    const novaAltura = geom.heightPct * ajuste.altura
    novaGeom = { ...novaGeom, topPct: novaGeom.topPct + (geom.heightPct - novaAltura) / 2, heightPct: novaAltura }
  }
  if (ajuste.largura) {
    const novaLargura = geom.widthPct * ajuste.largura
    const novoLeft = ajuste.centralizarH ? novaGeom.leftPct + (geom.widthPct - novaLargura) / 2 : novaGeom.leftPct
    novaGeom = { ...novaGeom, leftPct: novoLeft, widthPct: novaLargura }
  }
  return novaGeom
}

function bboxUniao(shapes) {
  const geoms = shapes.map((s) => GEOMETRIA_POR_SHAPE[s]).filter(Boolean)
  if (!geoms.length) return null
  const left = Math.min(...geoms.map((g) => g.leftPct))
  const top = Math.min(...geoms.map((g) => g.topPct))
  const right = Math.max(...geoms.map((g) => g.leftPct + g.widthPct))
  const bottom = Math.max(...geoms.map((g) => g.topPct + g.heightPct))
  return { leftPct: left, topPct: top, widthPct: right - left, heightPct: bottom - top }
}

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
  const { data: session } = useSession()
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
  // Sem isso, com total=0 (nenhum volume preenchido ainda) as % do total viravam 0/0 = NaN.
  const pctDoTotal = (valor) => (total > 0 ? valor / total * 100 : 0)

  const [gerando, setGerando] = useState(false)
  const [erroGeracao, setErroGeracao] = useState('')

  const campos = useMemo(() => getCampos(result, discovery, config), [result, discovery, config])
  const identificacaoCampos = useMemo(() => campos.filter((c) => c.group === 'Identificação'), [campos])
  const slidesProposta = useMemo(() => getSlidesDaProposta(discovery.canais_ativos), [discovery.canais_ativos])
  const mascaras = useMemo(() => getMascaras(result, discovery, config), [result, discovery, config])

  // Campos visuais (com shape conhecido) agrupados por slide — cada um vira um input sobreposto
  // na imagem real daquele slide, na posição exata do shape no template.
  const camposPorSlide = useMemo(() => {
    const map = new Map()
    campos.forEach((c) => {
      c.shapes.forEach((shape) => {
        const geomBruto = GEOMETRIA_POR_SHAPE[shape]
        if (!geomBruto) return
        // O shape pode ter 2 blocos de texto com tamanhos diferentes colados (ex: "R$ XX,XX" +
        // "ONE COLLECT" no mesmo shape) — usa o tamanho do lado (primeiro/último caractere) que
        // corresponde ao RUN que esse campo de fato edita, não sempre o último.
        const geom = { ...geomBruto, fontSize: c.run === 0 ? geomBruto.fontSizeFirst : geomBruto.fontSizeLast }
        if (!map.has(geom.slide)) map.set(geom.slide, [])
        map.get(geom.slide).push({ ...c, geom, shape, overlayKey: `${c.id}-${shape}` })
      })
    })
    return map
  }, [campos])

  // Textos dinâmicos (config), mas NÃO editáveis na revisão — só mostram o valor atual por cima
  // da imagem estática, sem input.
  const textosFixosPorSlide = useMemo(() => {
    const map = new Map()
    getTextosFixos(config).forEach((t) => {
      const geomBruto = GEOMETRIA_POR_SHAPE[t.shape]
      if (!geomBruto) return
      const geom = { ...geomBruto, fontSize: geomBruto.fontSizeLast }
      if (!map.has(geom.slide)) map.set(geom.slide, [])
      map.get(geom.slide).push({ ...t, geom })
    })
    return map
  }, [config])

  // Máscaras (seções/cards fora do escopo da proposta) agrupadas por slide, já com o bounding
  // box calculado a partir da geometria real dos shapes de cada grupo.
  const mascarasPorSlide = useMemo(() => {
    const map = new Map()
    mascaras.forEach((m) => {
      const box = bboxUniao(m.shapes)
      if (!box) return
      if (!map.has(m.slide)) map.set(m.slide, [])
      map.get(m.slide).push(box)
    })
    return map
  }, [mascaras])

  const [overrideValues, setOverrideValues] = useState({})
  const [confirmouRevisao, setConfirmouRevisao] = useState(false)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    if (step === 'editor') {
      setOverrideValues(Object.fromEntries(campos.map((c) => [c.id, c.value])))
      setConfirmouRevisao(false)
    }
  }, [step])

  const restaurarTodosOsCampos = () => {
    setOverrideValues(Object.fromEntries(campos.map((c) => [c.id, c.value])))
  }

  // Gerar a proposta precisa saber QUEM clicou (fica gravado em activity_log) — se ainda não tem
  // sessão, pede login antes; com sessão já ativa, gera direto.
  const handleCliqueGerar = () => {
    if (session?.user) {
      gerarProposta()
    } else {
      setErroLogin('')
      setMostrarLogin(true)
    }
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErroLogin('')
    setEntrando(true)
    const res = await signIn('credentials', { email: loginEmail, password: loginSenha, redirect: false })
    setEntrando(false)
    if (res?.error) {
      setErroLogin('E-mail ou senha incorretos.')
      return
    }
    setMostrarLogin(false)
    setLoginSenha('')
    gerarProposta()
  }

  const gerarProposta = async () => {
    setGerando(true)
    setErroGeracao('')
    try {
      const resp = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, discovery, config, overrides: overrideValues, confirmouRevisao }),
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

  const StepIndicator = ({ sticky }) => (
    <div className={`step-indicator${sticky ? ' step-indicator-sticky' : ''}`}>
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
        <StepIndicator sticky />

        <button className="btn btn-secondary btn-sm" onClick={() => setStep('proposta')} style={{ marginBottom: 16 }}>
          ← Voltar
        </button>

        <div className="card card-full">
          <div className="card-title">Revisar Conteúdo da Proposta</div>
          <p style={{ color: '#555', marginBottom: 12 }}>
            Role pelos slides como se fosse o PDF final. Clique em qualquer valor destacado pra editar —
            as áreas hachuradas em cinza são seções/produtos que não entram nesta proposta.
          </p>
          <div className="field-row" style={{ marginBottom: 4 }}>
            {identificacaoCampos.map((c) => (
              <div key={c.id} className="field-group">
                <label>{c.label}</label>
                <input
                  type="text"
                  value={overrideValues[c.id] ?? ''}
                  onChange={(e) => setOverrideValues((p) => ({ ...p, [c.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={restaurarTodosOsCampos}>
            ↺ Restaurar todos os valores calculados
          </button>
        </div>

        {slidesProposta.map((slideNum) => (
          <div key={slideNum}>
            <div className="slide-page-label">Slide {slideNum}</div>
            <div className="slide-page">
              <img className="slide-page-img" src={`/proposta-slides/slide-${slideNum}.png`} alt={`Slide ${slideNum}`} />
              {(mascarasPorSlide.get(slideNum) || []).map((box, i) => (
                <div
                  key={i}
                  className="slide-mask"
                  style={{ left: `${box.leftPct}%`, top: `${box.topPct}%`, width: `${box.widthPct}%`, height: `${box.heightPct}%` }}
                />
              ))}
              {(camposPorSlide.get(slideNum) || []).map((c) => {
                const geom = expandirGeom(aplicarAjusteFino(c.id, ajustarCaixaInput(aplicarAjusteManual(c.id, c.geom), overrideValues[c.id], c.shape)))
                return (
                  <input
                    key={c.overlayKey}
                    className="slide-overlay-input"
                    title={c.label}
                    value={overrideValues[c.id] ?? ''}
                    onChange={(e) => setOverrideValues((p) => ({ ...p, [c.id]: e.target.value }))}
                    style={{
                      left: `${geom.leftPct}%`,
                      top: `${geom.topPct}%`,
                      width: `${geom.widthPct}%`,
                      height: `${geom.heightPct}%`,
                      fontSize: fontSizeCqw(c.geom),
                      textAlign: c.geom.align || 'left',
                    }}
                  />
                )
              })}
              {(textosFixosPorSlide.get(slideNum) || []).map((t) => (
                <div
                  key={t.shape}
                  className="slide-overlay-text"
                  style={{
                    left: `${t.geom.leftPct}%`,
                    top: `${t.geom.topPct}%`,
                    width: `${t.geom.widthPct}%`,
                    height: `${t.geom.heightPct}%`,
                    fontSize: fontSizeCqw(t.geom, 7),
                  }}
                >
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
          As posições acima refletem o template — no slide de detalhamento de canais, o PPTX final reorganiza
          automaticamente as seções restantes pra preencher o espaço das que não entraram. Não editável nesta
          versão: tabela de referência de Cartas/Físico (slide 33) e textos fixos do template.
        </p>

        <div className="card card-full actions" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmouRevisao}
              onChange={(e) => setConfirmouRevisao(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>Visualizei e farei as mudanças necessárias antes de enviar para qualquer cliente.</span>
          </label>
          <button className="btn" onClick={handleCliqueGerar} disabled={gerando || !confirmouRevisao}>
            {gerando ? 'Gerando...' : 'Gerar Proposta (PPTX)'}
          </button>
          {session?.user && <span style={{ fontSize: 12, color: '#555' }}>Gerando como {session.user.email}</span>}
          {erroGeracao && <p style={{ color: '#c0392b', marginTop: 12 }}>{erroGeracao}</p>}
        </div>

        {mostrarLogin && (
          <div className="modal-overlay" onClick={() => setMostrarLogin(false)}>
            <div className="card modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="card-title">Login — Gerar Proposta</div>
              <p style={{ color: '#555', fontSize: 13, marginBottom: 12 }}>
                Pra registrar quem gerou cada proposta, entre com seu e-mail e senha.
              </p>
              <form onSubmit={handleLoginSubmit}>
                <div className="field-group">
                  <label>E-mail</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="voce@pgmais.com.br" required autoFocus />
                </div>
                <div className="field-group">
                  <label>Senha</label>
                  <input type="password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} required />
                </div>
                {erroLogin && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{erroLogin}</p>}
                <div className="actions">
                  <button type="submit" className="btn" disabled={entrando}>{entrando ? 'Entrando...' : 'Entrar e Gerar'}</button>
                  <button type="button" className="btn btn-secondary btn-hover-gray" onClick={() => setMostrarLogin(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}
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

      <div className="grid-pack">
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
            <div className="kpi-sub">{formatPct(pctDoTotal(result.categorias.one))} do total</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Categoria SMS</div>
            <div className="kpi-value">{formatMoney(result.categorias.sms)}</div>
            <div className="kpi-sub">{formatPct(pctDoTotal(result.categorias.sms))} do total</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Categoria Digital</div>
            <div className="kpi-value">{formatMoney(result.categorias.digital)}</div>
            <div className="kpi-sub">{formatPct(pctDoTotal(result.categorias.digital))} do total</div>
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
                  <td className="num">{item.tot ? formatPct(pctDoTotal(item.tot)) : '-'}</td>
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
                  <td className="num">{formatPct(pctDoTotal(item.tot))}</td>
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
