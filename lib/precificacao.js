function getPrecoPorFaixa(valor, faixas) {
  for (const f of faixas) {
    if (valor >= f.min && valor <= f.max) return f.preco
  }
  return faixas[faixas.length - 1].preco
}

const faixas_one = [
  { min: 0, max: 1000000, preco: 0.034 },
  { min: 1000001, max: 3000000, preco: 0.017 },
  { min: 3000001, max: 5000000, preco: 0.016 },
  { min: 5000001, max: 10000000, preco: 0.012 },
  { min: 10000001, max: 20000000, preco: 0.009 },
  { min: 20000001, max: Infinity, preco: 0.007 },
]

const planos_one = {
  basic: { mensal: 2500, limite_cpf: 25000, setup: 5000, excedente: 0.1 },
  plus: { mensal: 4500, limite_cpf: 50000, setup: 5000, excedente: 0.09 },
}

const PRECO = {
  sms: 0.055,
  rcs_basico: 0.075,
  consulta_whatsapp: 0.02,
  whatsbot_mensagem: 0.09,
  ura_minuto_movel: 0.1,
  imagem_fatura: 0.025,
  voz_humana: 0,        // ← preço a configurar
  google_meta_ads: 0,   // ← preço a configurar
  carta_fisica: 0,      // ← preço a configurar
}

function recomendarPlanoONE(cpfs) {
  if (cpfs <= 25000) return planos_one.basic
  if (cpfs <= 50000) return planos_one.plus
  return null
}

function calcONE(cpfs) {
  const plano = recomendarPlanoONE(cpfs)
  if (plano) {
    const excedente = Math.max(0, cpfs - plano.limite_cpf) * plano.excedente
    return { mensal: plano.mensal, setup: plano.setup, excedente, total_mensal: plano.mensal + excedente, modelo: cpfs <= 25000 ? 'Basic' : 'Plus' }
  }
  const precoCpf = getPrecoPorFaixa(cpfs, faixas_one)
  return { preco_cpf: precoCpf, total_mensal: cpfs * precoCpf, modelo: 'ONE Platform (CPF)' }
}

function calcWhatsAppMT(volume) {
  return getPrecoPorFaixa(volume, [
    { min: 0, max: 250000, preco: 0.27 }, { min: 250001, max: 500000, preco: 0.268 },
    { min: 500001, max: 750000, preco: 0.266 }, { min: 750001, max: 1000000, preco: 0.263 },
    { min: 1000001, max: Infinity, preco: 0.26 },
  ])
}

function calcSMS(volume) {
  return getPrecoPorFaixa(volume, [
    { min: 0, max: 10000, preco: 0.08 }, { min: 10001, max: 25000, preco: 0.075 },
    { min: 25001, max: 500000, preco: 0.07 }, { min: 500001, max: 2000000, preco: 0.065 },
    { min: 2000001, max: 3000000, preco: 0.06 }, { min: 3000001, max: Infinity, preco: 0.055 },
  ])
}

function calcEmail(volume) {
  return getPrecoPorFaixa(volume, [
    { min: 0, max: 1000000, preco: 0.015 }, { min: 1000001, max: 5000000, preco: 0.012 },
    { min: 5000001, max: 10000000, preco: 0.01 }, { min: 10000001, max: 20000000, preco: 0.0075 },
    { min: 20000001, max: Infinity, preco: 0.0058 },
  ])
}

function calcEnriquecimento(volume) {
  return getPrecoPorFaixa(volume, [
    { min: 0, max: 100000, preco: 0.04 }, { min: 100001, max: 500000, preco: 0.038 },
    { min: 500001, max: 1000000, preco: 0.036 }, { min: 1000001, max: 2500000, preco: 0.034 },
    { min: 2500001, max: 5000000, preco: 0.033 }, { min: 5000001, max: 10000000, preco: 0.029 },
    { min: 10000001, max: Infinity, preco: 0.026 },
  ])
}

export function formatMoney(valor) {
  return `R$ ${valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export function formatPct(valor) {
  return `${parseFloat(valor).toFixed(1)}%`
}

export function calcular(dados) {
  const cpfs = parseFloat(dados.cpfs) || 0
  const faturas = parseFloat(dados.faturas) || 0

  const v = {
    sms_texto: parseFloat(dados.sms_texto) || 0,
    sms_whats: parseFloat(dados.sms_whats) || 0,
    sms_landing: parseFloat(dados.sms_landing) || 0,
    sms_imagem: parseFloat(dados.sms_imagem) || 0,
    whats_ativo: parseFloat(dados.whats_ativo) || 0,
    whats_receptivo: parseFloat(dados.whats_receptivo) || 0,
    voicebot: parseFloat(dados.voicebot) || 0,
    rcs: parseFloat(dados.rcs) || 0,
    email: parseFloat(dados.email) || 0,
    email_fatura: parseFloat(dados.email_fatura) || 0,
    imagem_fatura: parseFloat(dados.imagem_fatura) || 0,
    chatbot: parseFloat(dados.chatbot) || 0,
    enriquecimento: parseFloat(dados.enriquecimento) || 0,
    voz_humana: parseFloat(dados.voz_humana) || 0,
    google_meta_ads: parseFloat(dados.google_meta_ads) || 0,
    cartas_fisico: parseFloat(dados.cartas_fisico) || 0,
  }

  const smsTotal = v.sms_texto + v.sms_whats + v.sms_landing + v.sms_imagem
  const preco_sms = calcSMS(smsTotal)
  const preco_email = calcEmail(v.email)
  const preco_email_fatura = calcEmail(v.email_fatura)
  const preco_enriquecimento = calcEnriquecimento(v.enriquecimento)
  const preco_wpp_mt = calcWhatsAppMT(v.whats_ativo + v.whats_receptivo)
  const plano_one = calcONE(cpfs)

  const orc = {
    one_platform: plano_one.total_mensal,
    email: v.email * preco_email,
    email_fatura: v.email_fatura * preco_email_fatura,
    imagem_fatura: v.imagem_fatura * PRECO.imagem_fatura,
    sms_texto: v.sms_texto * preco_sms,
    sms_whats: v.sms_whats * preco_sms,
    sms_landing: v.sms_landing * preco_sms,
    sms_imagem: v.sms_imagem * preco_sms,
    whats_ativo_mt: v.whats_ativo * preco_wpp_mt,
    whats_ativo_mo: v.whats_ativo * 0.015,
    whats_receptivo: v.whats_receptivo * preco_wpp_mt,
    rcs: v.rcs * PRECO.rcs_basico,
    enriquecimento: v.enriquecimento * preco_enriquecimento,
    chatbot: v.chatbot * PRECO.whatsbot_mensagem,
    voicebot: v.voicebot * PRECO.ura_minuto_movel,
    consulta_whatsapp: v.whats_ativo * PRECO.consulta_whatsapp,
    voz_humana: v.voz_humana * PRECO.voz_humana,
    google_meta_ads: v.google_meta_ads * PRECO.google_meta_ads,
    cartas_fisico: v.cartas_fisico * PRECO.carta_fisica,
  }

  const cat_one = orc.one_platform + orc.email + orc.email_fatura + orc.imagem_fatura + orc.sms_imagem
  const cat_sms = (v.sms_texto + v.sms_whats + v.sms_landing) * preco_sms
  const cat_digital = orc.whats_ativo_mt + orc.whats_ativo_mo + orc.whats_receptivo + orc.rcs + orc.enriquecimento + orc.chatbot + orc.voicebot + orc.consulta_whatsapp + orc.voz_humana + orc.google_meta_ads + orc.cartas_fisico
  const total = cat_one + cat_sms + cat_digital

  const pct = {}
  if (total > 0) Object.keys(orc).forEach(k => { pct[k] = ((orc[k] / total) * 100).toFixed(2) })

  return {
    entrada: { cpfs, faturas, multiplicador: cpfs > 0 ? (faturas / cpfs).toFixed(4) : '0' },
    plano_one: plano_one.modelo.includes('Basic') || plano_one.modelo.includes('Plus')
      ? { ...plano_one, modelo: `ONE ${plano_one.modelo}` }
      : { ...plano_one, modelo: 'ONE Platform' },
    precos: {
      one: preco_sms, sms: preco_sms, email: preco_email,
      email_fatura: preco_email_fatura, imagem_fatura: PRECO.imagem_fatura,
      enriquecimento: preco_enriquecimento, whatsapp_mt: preco_wpp_mt,
      rcs: PRECO.rcs_basico, chatbot: PRECO.whatsbot_mensagem,
      voicebot: PRECO.ura_minuto_movel, consulta_whatsapp: PRECO.consulta_whatsapp,
      voz_humana: PRECO.voz_humana, google_meta_ads: PRECO.google_meta_ads,
      cartas_fisico: PRECO.carta_fisica,
    },
    orcamentos: Object.fromEntries(Object.entries(orc).map(([k, v]) => [k, parseFloat(v.toFixed(2))])),
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
