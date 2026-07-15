import { PRICING_DEFAULTS } from './pricingDefaults'

function num0(valor) {
  return Math.max(0, parseFloat(valor) || 0)
}

// max:null nos defaults significa "sem teto" (JSON não tem Infinity)
function semTeto(max) {
  return max === null || max === undefined ? Infinity : max
}

function getPrecoPorFaixa(valor, faixas) {
  for (const f of faixas) {
    if (valor >= f.min && valor <= semTeto(f.max)) return f.preco
  }
  return faixas[faixas.length - 1].preco
}

function calcONEEnterprise(cpfs, faixas) {
  let total = 0
  let restante = cpfs
  for (const f of faixas) {
    if (restante <= 0) break
    const max = semTeto(f.max)
    const tamanhoFaixa = max - f.min
    const nestaFaixa = Math.min(restante, tamanhoFaixa)
    total += nestaFaixa * f.preco
    restante -= nestaFaixa
  }
  return total
}

// Telecobrança (parceiro CICLO) — dimensionamento por PA (posição de atendimento)
function calcTelecobranca(cpfs, cfg) {
  if (cpfs <= 0) return { pa: 0, voice_ai: 0, cross_channel: 0 }
  const pa = Math.max(cfg.pa_minimo, Math.ceil(cpfs / cfg.cpfs_por_pa))
  return { pa, voice_ai: pa * cfg.voice_ai_por_pa, cross_channel: pa * cfg.cross_channel_por_pa }
}

function recomendarPlanoONE(cpfs, cfg) {
  if (cpfs <= cfg.basic.limite_cpf) return cfg.basic
  if (cpfs <= cfg.plus.limite_cpf) return cfg.plus
  return null
}

function calcONE(cpfs, cfg) {
  const plano = recomendarPlanoONE(cpfs, cfg)
  if (plano) {
    const excedente = Math.max(0, cpfs - plano.limite_cpf) * plano.excedente
    const modelo = plano === cfg.basic ? 'Basic' : 'Plus'
    return { mensal: plano.mensal, setup: plano.setup, excedente, total_mensal: plano.mensal + excedente, modelo }
  }
  const total_mensal = calcONEEnterprise(cpfs, cfg.enterprise_faixas)
  return { preco_cpf: cpfs > 0 ? total_mensal / cpfs : 0, total_mensal, modelo: 'ONE Platform (CPF)' }
}

// O cliente contrata um plano específico (não há upgrade automático por volume);
// se a volumetria ultrapassar o limite do plano contratado, paga o excedente por atendimento.
function calcOMNI(conversas, planoNome, cfg) {
  const plano = cfg.planos.find(p => p.nome === planoNome)
  if (!plano) return { mensal: 0, total_mensal: 0, excedente: 0, nome: null }
  if (plano.mensal === null) return { mensal: 0, total_mensal: 0, excedente: 0, nome: `${plano.nome} (sob consulta)` }
  const excedente = Math.max(0, conversas - semTeto(plano.conversas)) * plano.excedente
  return { mensal: plano.mensal, excedente, total_mensal: plano.mensal + excedente, nome: plano.nome }
}

export function getSetups(canaisAtivos, planoOne, config = PRICING_DEFAULTS) {
  const ativo = k => canaisAtivos.includes(k)
  const items = []
  if (ativo('one_platform')) {
    if (planoOne.modelo.includes('Basic')) items.push({ label: 'ONE Basic (setup)', valor: config.one.basic.setup })
    else if (planoOne.modelo.includes('Plus')) items.push({ label: 'ONE Plus (setup)', valor: config.one.plus.setup })
    else items.push({ label: 'ONE Enterprise (setup por portfólio contratado)', valor: config.one.enterprise_setup })
  }
  if (ativo('chatbot')) items.push({ label: 'Chatbot (setup)', valor: config.setup.chatbot })
  if (ativo('voicebot')) items.push({ label: 'Voicebot (setup)', valor: config.setup.voicebot })
  if (ativo('portal_negociacao')) items.push({ label: 'Portal de Negociação (setup)', valor: config.setup.portal_negociacao })
  if (ativo('landing_page_link')) items.push({ label: 'Landing Page (setup)', valor: config.setup.landing_page_link })
  if (ativo('rcs')) items.push({ label: 'RCS (setup)', valor: config.setup.rcs })
  if (ativo('whats_ativo') || ativo('whats_receptivo')) items.push({ label: 'WhatsApp (setup de conta)', valor: config.setup.whatsapp })
  return items
}

export function formatMoney(valor) {
  return `R$ ${valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export function formatPct(valor) {
  return `${parseFloat(valor).toFixed(1)}%`
}

// orc key -> canal (chave usada no Discovery) quando o nome difere
const CANAL_DO_ORC = { omni: 'omni_conversas' }

export function calcular(dados, canaisAtivos = [], config = PRICING_DEFAULTS) {
  const canalAtivo = (k) => canaisAtivos.includes(CANAL_DO_ORC[k] || k)
  const cpfs = num0(dados.cpfs)
  const faturas = num0(dados.faturas)
  const PRECO = config.precos

  const v = {
    sms_texto: num0(dados.sms_texto),
    sms_whats: num0(dados.sms_whats),
    sms_landing: num0(dados.sms_landing),
    sms_imagem: num0(dados.sms_imagem),
    sms_fast_otp: num0(dados.sms_fast_otp),
    sms_rota_exclusiva: num0(dados.sms_rota_exclusiva),
    sms_sender_id: num0(dados.sms_sender_id),
    sms_flash: num0(dados.sms_flash),
    whats_ativo: num0(dados.whats_ativo),
    whats_receptivo: num0(dados.whats_receptivo),
    voicebot: num0(dados.voicebot),
    rcs: num0(dados.rcs),
    email: num0(dados.email),
    email_fatura: num0(dados.email_fatura),
    imagem_fatura: num0(dados.imagem_fatura),
    email_registrado: num0(dados.email_registrado),
    email_smtp: num0(dados.email_smtp),
    email_pdf: num0(dados.email_pdf),
    chatbot: num0(dados.chatbot),
    enriquecimento: num0(dados.enriquecimento),
    valida_mais: num0(dados.valida_mais),
    enriquecimento_premium: num0(dados.enriquecimento_premium),
    google_meta_ads: num0(dados.google_meta_ads),
    cartas_fisico: num0(dados.cartas_fisico),
    omni_conversas: num0(dados.omni_conversas),
    telegrama: num0(dados.telegrama),
    carne: num0(dados.carne),
    cartorio_documento: num0(dados.cartorio_documento),
    landing_page_link: num0(dados.landing_page_link),
    portal_negociacao: num0(dados.portal_negociacao),
  }

  const smsTotal = v.sms_texto + v.sms_whats + v.sms_landing + v.sms_imagem
  const preco_sms = getPrecoPorFaixa(smsTotal, config.faixas.sms)
  const preco_email = getPrecoPorFaixa(v.email, config.faixas.email)
  const preco_email_fatura = getPrecoPorFaixa(v.email_fatura, config.faixas.email)
  const preco_enriquecimento = getPrecoPorFaixa(v.enriquecimento, config.faixas.enriquecimento)
  const preco_email_registrado = getPrecoPorFaixa(v.email_registrado, config.faixas.email_registrado)
  const pacote_email_smtp = getPrecoPorFaixa(v.email_smtp, config.faixas.email_smtp)
  const plano_one = calcONE(cpfs, config.one)
  const plano_omni = calcOMNI(v.omni_conversas, dados.omni_plano, config.omni)
  const plano_telecobranca = calcTelecobranca(cpfs, config.telecobranca)

  const orc = {
    one_platform: plano_one.total_mensal,
    email: v.email * preco_email,
    email_fatura: v.email_fatura * preco_email_fatura,
    imagem_fatura: v.imagem_fatura * PRECO.imagem_fatura,
    email_registrado: v.email_registrado * preco_email_registrado,
    email_smtp: v.email_smtp > 0 ? pacote_email_smtp : 0,
    email_pdf: v.email_pdf > 0 ? PRECO.email_pdf_manutencao + v.email_pdf * PRECO.email_pdf_geracao : 0,
    sms_texto: v.sms_texto * preco_sms,
    sms_whats: v.sms_whats * preco_sms,
    sms_landing: v.sms_landing * preco_sms,
    sms_imagem: v.sms_imagem * preco_sms,
    sms_fast_otp: v.sms_fast_otp * PRECO.sms_fast_otp,
    sms_rota_exclusiva: v.sms_rota_exclusiva * PRECO.sms_rota_exclusiva,
    sms_sender_id: v.sms_sender_id * PRECO.sms_sender_id,
    sms_flash: v.sms_flash * PRECO.sms_flash,
    whats_ativo: v.whats_ativo * PRECO.whats_ativo_envio,
    whats_receptivo: v.whats_receptivo * PRECO.whats_receptivo_conversa,
    rcs: v.rcs * PRECO.rcs_basico,
    enriquecimento: v.enriquecimento * preco_enriquecimento,
    valida_mais: v.valida_mais * PRECO.valida_mais,
    enriquecimento_premium: v.enriquecimento_premium * PRECO.enriquecimento_premium,
    chatbot: v.chatbot > 0 ? Math.max(v.chatbot * PRECO.chatbot_unit, PRECO.chatbot_franquia) : 0,
    voicebot: v.voicebot > 0 ? Math.max(v.voicebot * PRECO.voicebot_unit, PRECO.voicebot_min_robos * PRECO.voicebot_unit) : 0,
    google_meta_ads: v.google_meta_ads > 0 ? Math.max(v.google_meta_ads * PRECO.ads_campanha, PRECO.ads_franquia) : 0,
    cartas_fisico: v.cartas_fisico * PRECO.carta_fisica,
    omni: plano_omni.total_mensal,
    telegrama: v.telegrama * PRECO.telegrama,
    carne: v.carne * PRECO.carne,
    cartorio_documento: v.cartorio_documento * PRECO.cartorio_documento,
    landing_page_link: v.landing_page_link * PRECO.landing_page_link,
    portal_negociacao: v.portal_negociacao * PRECO.portal_negociacao,
    telecobranca_voice_ai: plano_telecobranca.voice_ai,
    telecobranca_cross_channel: plano_telecobranca.cross_channel,
    telecobranca_expert_human: 0, // dimensionamento customizado — sob consulta
  }

  // Só entram no total os produtos marcados como ativos no Discovery — impede que
  // canais derivados de CPFs (ONE, OMNI, Telecobrança) sejam cobrados sem terem sido selecionados.
  const orcGated = Object.fromEntries(Object.entries(orc).map(([k, val]) => [k, canalAtivo(k) ? val : 0]))

  const cat_one = orcGated.one_platform + orcGated.email + orcGated.email_fatura + orcGated.imagem_fatura + orcGated.sms_imagem
  const cat_sms = orcGated.sms_texto + orcGated.sms_whats + orcGated.sms_landing
  const cat_digital = orcGated.whats_ativo + orcGated.whats_receptivo + orcGated.rcs + orcGated.enriquecimento + orcGated.valida_mais
    + orcGated.enriquecimento_premium + orcGated.chatbot + orcGated.voicebot + orcGated.google_meta_ads + orcGated.cartas_fisico
    + orcGated.omni + orcGated.telegrama + orcGated.carne + orcGated.cartorio_documento + orcGated.landing_page_link + orcGated.portal_negociacao
    + orcGated.email_registrado + orcGated.email_smtp + orcGated.email_pdf + orcGated.sms_fast_otp + orcGated.sms_rota_exclusiva
    + orcGated.sms_sender_id + orcGated.sms_flash + orcGated.telecobranca_voice_ai + orcGated.telecobranca_cross_channel + orcGated.telecobranca_expert_human
  const total = cat_one + cat_sms + cat_digital

  const pct = {}
  if (total > 0) Object.keys(orcGated).forEach(k => { pct[k] = ((orcGated[k] / total) * 100).toFixed(2) })

  return {
    entrada: { cpfs, faturas, multiplicador: cpfs > 0 ? (faturas / cpfs).toFixed(4) : '0' },
    plano_one: plano_one.modelo.includes('Basic') || plano_one.modelo.includes('Plus')
      ? { ...plano_one, modelo: `ONE ${plano_one.modelo}` }
      : { ...plano_one, modelo: 'ONE Platform' },
    plano_omni,
    plano_telecobranca,
    precos: {
      one: preco_sms, sms: preco_sms, email: preco_email,
      email_fatura: preco_email_fatura, imagem_fatura: PRECO.imagem_fatura,
      enriquecimento: preco_enriquecimento,
      rcs: PRECO.rcs_basico,
      google_meta_ads: PRECO.ads_campanha,
      cartas_fisico: PRECO.carta_fisica,
      telegrama: PRECO.telegrama, carne: PRECO.carne,
      cartorio_documento: PRECO.cartorio_documento,
      valida_mais: PRECO.valida_mais, enriquecimento_premium: PRECO.enriquecimento_premium,
      landing_page_link: PRECO.landing_page_link, portal_negociacao: PRECO.portal_negociacao,
      email_registrado: preco_email_registrado, email_smtp: v.email_smtp > 0 ? pacote_email_smtp / v.email_smtp : 0,
      email_pdf: PRECO.email_pdf_geracao,
      sms_fast_otp: PRECO.sms_fast_otp, sms_rota_exclusiva: PRECO.sms_rota_exclusiva,
      sms_sender_id: PRECO.sms_sender_id, sms_flash: PRECO.sms_flash,
      whats_ativo: PRECO.whats_ativo_envio, whats_receptivo: PRECO.whats_receptivo_conversa,
      chatbot: v.chatbot > 0 ? orc.chatbot / v.chatbot : PRECO.chatbot_unit,
      voicebot: v.voicebot > 0 ? orc.voicebot / v.voicebot : PRECO.voicebot_unit,
    },
    orcamentos: Object.fromEntries(Object.entries(orcGated).map(([k, v]) => [k, parseFloat(v.toFixed(2))])),
    categorias: {
      one: parseFloat(cat_one.toFixed(2)),
      sms: parseFloat(cat_sms.toFixed(2)),
      digital: parseFloat(cat_digital.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    },
    percentuais: pct,
    volumes: v,
    smsTotal,
  }
}
