import { PRICING_DEFAULTS } from './pricingDefaults'

function num0(valor) {
  return Math.max(0, parseFloat(valor) || 0)
}

// max:null nos defaults significa "sem teto" (JSON não tem Infinity)
function semTeto(max) {
  return max === null || max === undefined ? Infinity : max
}

function getPrecoPorFaixa(valor, faixas) {
  if (faixas.length === 0) return 0
  for (const f of faixas) {
    if (valor >= f.min && valor <= semTeto(f.max)) return f.preco
  }
  return faixas[faixas.length - 1].preco
}

// E-mail Transacional — cada faixa é um pacote mensal fechado (não multiplica por volume).
// Na última faixa (sem teto), soma excedente por unidade sobre o que passar do início dela.
// Uma franquia mínima mensal se aplica mesmo se o pacote da faixa for menor.
function calcEmailTransacional(volume, faixas, franquiaMinima = 0) {
  if (faixas.length === 0) return 0
  for (const f of faixas) {
    if (f.max === null) {
      const excedente = Math.max(0, volume - (f.min - 1)) * (f.excedente || 0)
      return Math.max(f.preco + excedente, franquiaMinima)
    }
    if (volume <= f.max) return Math.max(f.preco, franquiaMinima)
  }
  return Math.max(faixas[faixas.length - 1].preco, franquiaMinima)
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

// Acima do limite do Plus, o cliente escolhe entre Enterprise e Pro (mesmo setup, faixas de
// excedente diferentes) — 'modelo' vem do seletor da calculadora, default Enterprise.
function calcONE(cpfs, cfg, modelo = 'Enterprise') {
  const plano = recomendarPlanoONE(cpfs, cfg)
  if (plano) {
    const excedente = Math.max(0, cpfs - plano.limite_cpf) * plano.excedente
    const modeloPlano = plano === cfg.basic ? 'Basic' : 'Plus'
    return { mensal: plano.mensal, setup: plano.setup, excedente, total_mensal: plano.mensal + excedente, modelo: modeloPlano }
  }
  const faixas = modelo === 'Pro' ? cfg.pro_faixas : cfg.enterprise_faixas
  const total_mensal = calcONEEnterprise(cpfs, faixas)
  return { preco_cpf: cpfs > 0 ? total_mensal / cpfs : 0, total_mensal, modelo: modelo === 'Pro' ? 'ONE Platform (CPF) - Pro' : 'ONE Platform (CPF)' }
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
    else if (planoOne.modelo.includes('Pro')) items.push({ label: 'ONE Pro (setup por portfólio contratado)', valor: config.one.enterprise_setup })
    else items.push({ label: 'ONE Enterprise (setup por portfólio contratado)', valor: config.one.enterprise_setup })
  }
  if (ativo('chatbot')) items.push({ label: 'Chatbot (setup)', valor: config.setup.chatbot })
  if (ativo('voicebot')) items.push({ label: 'Voicebot (setup)', valor: config.setup.voicebot })
  if (ativo('portal_negociacao')) items.push({ label: 'Portal de Negociação (setup)', valor: config.setup.portal_negociacao })
  if (ativo('landing_page_link')) items.push({ label: 'Landing Page (setup)', valor: config.setup.landing_page_link })
  if (ativo('rcs') || ativo('rcs_basico') || ativo('rcs_simples')) items.push({ label: 'RCS (setup)', valor: config.setup.rcs })
  if (ativo('whats_ativo') || ativo('whats_receptivo')) items.push({ label: 'WhatsApp (setup de conta)', valor: config.setup.whatsapp })
  if (ativo('kami_robo_localizacao') || ativo('kami_robo_negociacao')) items.push({ label: 'Kami Voz (setup por carteira)', valor: config.kami.setup })
  if (ativo('whats_mobile')) items.push({ label: 'WhatsApp Mobile (ativação)', valor: config.whatsapp_mobile.ativacao })
  return items
}

export function formatMoney(valor) {
  return `R$ ${valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

// Preço por unidade (SMS/E-mail/etc.) — 2 casas decimais arredonda tarifas como R$0,066 ou
// R$0,0095 pra um valor diferente do contratado. Usar em qualquer "R$/unidade" exibido pro
// cliente (tabela da calculadora, proposta); totais em R$ continuam com formatMoney (2 casas).
// Separador de milhar só na parte inteira — aplicado nas 4 casas decimais, "0,0660" viraria
// "0,0.660" (o regex de agrupar de 3 em 3 não sabe onde a vírgula termina).
export function formatMoneyPreciso(valor) {
  const [inteiro, decimalCompleto] = valor.toFixed(4).split('.')
  // Sempre calcula com 4 casas (evita arredondar tarifas como R$0,0095), mas corta zeros à
  // direita supérfluos — R$0,2000 fica R$0,20, R$0,045 fica R$0,045 — mantendo no mínimo 2 casas.
  let decimal = decimalCompleto
  while (decimal.length > 2 && decimal.endsWith('0')) decimal = decimal.slice(0, -1)
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal}`
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
    sms_fast_otp: num0(dados.sms_fast_otp),
    sms_rota_exclusiva: num0(dados.sms_rota_exclusiva),
    sms_sender_id: num0(dados.sms_sender_id),
    sms_flash: num0(dados.sms_flash),
    whats_ativo: num0(dados.whats_ativo),
    whats_receptivo: num0(dados.whats_receptivo),
    voicebot: num0(dados.voicebot),
    rcs: num0(dados.rcs),
    rcs_basico: num0(dados.rcs_basico),
    rcs_simples: num0(dados.rcs_simples),
    email: num0(dados.email),
    email_transacional: num0(dados.email_transacional),
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
    documento_digital: num0(dados.documento_digital),
    landing_page_link: num0(dados.landing_page_link),
    portal_negociacao: num0(dados.portal_negociacao),
    kami_robo_localizacao: num0(dados.kami_robo_localizacao),
    kami_robo_negociacao: num0(dados.kami_robo_negociacao),
    kami_texto: num0(dados.kami_texto),
    whats_mobile_mt: num0(dados.whats_mobile_mt),
    whats_mobile_mo: num0(dados.whats_mobile_mo),
    smart_contact_phone_score: num0(dados.smart_contact_phone_score),
    smart_contact_phone_enriquecimento: num0(dados.smart_contact_phone_enriquecimento),
    smart_contact_email_score: num0(dados.smart_contact_email_score),
    smart_contact_email_enriquecimento: num0(dados.smart_contact_email_enriquecimento),
  }

  const smsTotal = v.sms_texto
  const preco_sms = getPrecoPorFaixa(smsTotal, config.faixas.sms)
  const preco_email = getPrecoPorFaixa(v.email, config.faixas.email)
  const preco_enriquecimento = getPrecoPorFaixa(v.enriquecimento, config.faixas.enriquecimento)
  const preco_email_registrado = getPrecoPorFaixa(v.email_registrado, config.faixas.email_registrado)
  const pacote_email_smtp = getPrecoPorFaixa(v.email_smtp, config.faixas.email_smtp)
  const pacote_email_transacional = calcEmailTransacional(v.email_transacional, config.faixas.email_transacional, PRECO.email_transacional_franquia_minima)
  const pacote_kami_texto = getPrecoPorFaixa(v.kami_texto, config.faixas.kami_texto)
  const preco_whats_mobile_mt = getPrecoPorFaixa(v.whats_mobile_mt, config.faixas.whatsapp_mobile_mt)
  const preco_whats_mobile_mo = getPrecoPorFaixa(v.whats_mobile_mo, config.faixas.whatsapp_mobile_mo)
  const plano_one = calcONE(cpfs, config.one, dados.one_modelo)
  const plano_omni = calcOMNI(v.omni_conversas, dados.omni_plano, config.omni)
  const plano_telecobranca = calcTelecobranca(cpfs, config.telecobranca)

  const orc = {
    one_platform: plano_one.total_mensal,
    email: v.email * preco_email,
    email_transacional: v.email_transacional > 0 ? pacote_email_transacional : 0,
    email_registrado: v.email_registrado * preco_email_registrado,
    email_smtp: v.email_smtp > 0 ? pacote_email_smtp : 0,
    email_pdf: v.email_pdf > 0 ? PRECO.email_pdf_manutencao + v.email_pdf * PRECO.email_pdf_geracao : 0,
    sms_texto: v.sms_texto * preco_sms,
    sms_fast_otp: v.sms_fast_otp * PRECO.sms_fast_otp,
    sms_rota_exclusiva: v.sms_rota_exclusiva * PRECO.sms_rota_exclusiva,
    sms_sender_id: v.sms_sender_id * PRECO.sms_sender_id,
    sms_flash: v.sms_flash * PRECO.sms_flash,
    whats_ativo: v.whats_ativo * PRECO.whats_ativo_envio,
    whats_receptivo: v.whats_receptivo * PRECO.whats_receptivo_conversa,
    rcs: v.rcs * PRECO.rcs_conversacional,
    rcs_basico: v.rcs_basico * PRECO.rcs_basico,
    rcs_simples: v.rcs_simples * PRECO.rcs_simples,
    enriquecimento: v.enriquecimento * preco_enriquecimento,
    valida_mais: v.valida_mais * PRECO.valida_mais,
    enriquecimento_premium: v.enriquecimento_premium * PRECO.enriquecimento_premium,
    chatbot: v.chatbot > 0 ? Math.max(v.chatbot * PRECO.chatbot_unit, PRECO.chatbot_franquia) : 0,
    voicebot: v.voicebot > 0 ? Math.max(v.voicebot * PRECO.voicebot_unit, PRECO.voicebot_min_robos * PRECO.voicebot_unit) : 0,
    google_meta_ads: v.google_meta_ads > 0 ? Math.max(v.google_meta_ads * PRECO.ads_campanha, PRECO.ads_franquia) : 0,
    // Preço varia até 24x entre tipo/formato/impressão — não dá pra assumir um valor único
    // pra multiplicar por volume. Não entra no total da calculadora; a tabela completa (menos
    // MDP-Básica) aparece como referência na proposta gerada (lib/proposta.js, slide dedicado).
    cartas_fisico: 0,
    omni: plano_omni.total_mensal,
    telegrama: v.telegrama * PRECO.telegrama,
    carne: v.carne * PRECO.carne,
    cartorio_documento: v.cartorio_documento * PRECO.cartorio_documento,
    documento_digital: v.documento_digital * PRECO.documento_digital,
    landing_page_link: v.landing_page_link * PRECO.landing_page_link,
    portal_negociacao: v.portal_negociacao * PRECO.portal_negociacao,
    telecobranca_voice_ai: plano_telecobranca.voice_ai,
    telecobranca_cross_channel: plano_telecobranca.cross_channel,
    telecobranca_expert_human: 0, // dimensionamento customizado — sob consulta
    kami_robo_localizacao: v.kami_robo_localizacao * config.kami.robo_localizacao,
    kami_robo_negociacao: v.kami_robo_negociacao * config.kami.robo_negociacao,
    kami_texto: v.kami_texto > 0 ? pacote_kami_texto : 0,
    // Fee mensal + franquia mínima combinados no MT+MO — evita duplicar o piso se os dois estiverem ativos.
    whats_mobile: (v.whats_mobile_mt + v.whats_mobile_mo) > 0
      ? Math.max(v.whats_mobile_mt * preco_whats_mobile_mt + v.whats_mobile_mo * preco_whats_mobile_mo + config.whatsapp_mobile.fee_mensal, config.whatsapp_mobile.franquia_minima)
      : 0,
    smart_contact_phone_score: v.smart_contact_phone_score * PRECO.smart_contact_phone_score,
    smart_contact_phone_enriquecimento: v.smart_contact_phone_enriquecimento * PRECO.smart_contact_phone_enriquecimento,
    smart_contact_email_score: v.smart_contact_email_score * PRECO.smart_contact_email_score,
    smart_contact_email_enriquecimento: v.smart_contact_email_enriquecimento * PRECO.smart_contact_email_enriquecimento,
  }

  // Só entram no total os produtos marcados como ativos no Discovery — impede que
  // canais derivados de CPFs (ONE, OMNI, Telecobrança) sejam cobrados sem terem sido selecionados.
  const orcGated = Object.fromEntries(Object.entries(orc).map(([k, val]) => [k, canalAtivo(k) ? val : 0]))

  const cat_one = orcGated.one_platform + orcGated.email + orcGated.email_transacional
  const cat_sms = orcGated.sms_texto
  const cat_digital = orcGated.whats_ativo + orcGated.whats_receptivo + orcGated.rcs + orcGated.rcs_basico + orcGated.rcs_simples
    + orcGated.enriquecimento + orcGated.valida_mais
    + orcGated.enriquecimento_premium + orcGated.chatbot + orcGated.voicebot + orcGated.google_meta_ads + orcGated.cartas_fisico
    + orcGated.omni + orcGated.telegrama + orcGated.carne + orcGated.cartorio_documento + orcGated.documento_digital + orcGated.landing_page_link + orcGated.portal_negociacao
    + orcGated.email_registrado + orcGated.email_smtp + orcGated.email_pdf + orcGated.sms_fast_otp + orcGated.sms_rota_exclusiva
    + orcGated.sms_sender_id + orcGated.sms_flash + orcGated.telecobranca_voice_ai + orcGated.telecobranca_cross_channel + orcGated.telecobranca_expert_human
    + orcGated.kami_robo_localizacao + orcGated.kami_robo_negociacao + orcGated.kami_texto + orcGated.whats_mobile
    + orcGated.smart_contact_phone_score + orcGated.smart_contact_phone_enriquecimento + orcGated.smart_contact_email_score + orcGated.smart_contact_email_enriquecimento
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
      email_transacional: v.email_transacional > 0 ? pacote_email_transacional / v.email_transacional : 0,
      enriquecimento: preco_enriquecimento,
      rcs: PRECO.rcs_conversacional,
      rcs_basico: PRECO.rcs_basico,
      rcs_simples: PRECO.rcs_simples,
      google_meta_ads: PRECO.ads_campanha,
      telegrama: PRECO.telegrama, carne: PRECO.carne,
      cartorio_documento: PRECO.cartorio_documento,
      documento_digital: PRECO.documento_digital,
      valida_mais: PRECO.valida_mais, enriquecimento_premium: PRECO.enriquecimento_premium,
      landing_page_link: PRECO.landing_page_link, portal_negociacao: PRECO.portal_negociacao,
      email_registrado: preco_email_registrado, email_smtp: v.email_smtp > 0 ? pacote_email_smtp / v.email_smtp : 0,
      email_pdf: PRECO.email_pdf_geracao,
      sms_fast_otp: PRECO.sms_fast_otp, sms_rota_exclusiva: PRECO.sms_rota_exclusiva,
      sms_sender_id: PRECO.sms_sender_id, sms_flash: PRECO.sms_flash,
      whats_ativo: PRECO.whats_ativo_envio, whats_receptivo: PRECO.whats_receptivo_conversa,
      chatbot: v.chatbot > 0 ? orc.chatbot / v.chatbot : PRECO.chatbot_unit,
      voicebot: v.voicebot > 0 ? orc.voicebot / v.voicebot : PRECO.voicebot_unit,
      kami_robo_localizacao: config.kami.robo_localizacao,
      kami_robo_negociacao: config.kami.robo_negociacao,
      kami_texto: v.kami_texto > 0 ? pacote_kami_texto / v.kami_texto : 0,
      whats_mobile: (v.whats_mobile_mt + v.whats_mobile_mo) > 0 ? orc.whats_mobile / (v.whats_mobile_mt + v.whats_mobile_mo) : 0,
      smart_contact_phone_score: PRECO.smart_contact_phone_score,
      smart_contact_phone_enriquecimento: PRECO.smart_contact_phone_enriquecimento,
      smart_contact_email_score: PRECO.smart_contact_email_score,
      smart_contact_email_enriquecimento: PRECO.smart_contact_email_enriquecimento,
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
