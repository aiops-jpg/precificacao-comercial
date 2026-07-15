export const CANAIS_GRUPOS = [
  { grupo: 'ONE', itens: [
    { key: 'one_platform', label: 'ONE Platform' },
  ]},
  { grupo: 'SMS', itens: [
    { key: 'sms_texto', label: 'SMS Texto' },
    { key: 'sms_whats', label: 'SMS c/ link WhatsApp' },
    { key: 'sms_landing', label: 'SMS c/ link Portal' },
    { key: 'sms_imagem', label: 'SMS c/ imagem' },
    { key: 'sms_fast_otp', label: 'SMS FAST/OTP' },
    { key: 'sms_rota_exclusiva', label: 'SMS Rota Exclusiva' },
    { key: 'sms_sender_id', label: 'SMS Sender ID' },
    { key: 'sms_flash', label: 'SMS Flash' },
  ]},
  { grupo: 'WhatsApp', itens: [
    { key: 'whats_ativo', label: 'WhatsApp Ativo' },
    { key: 'whats_receptivo', label: 'WhatsApp Receptivo' },
  ]},
  { grupo: 'Email', itens: [
    { key: 'email', label: 'E-mail Transacional' },
    { key: 'email_fatura', label: 'E-mail Fatura' },
    { key: 'imagem_fatura', label: 'Imagem Fatura' },
    { key: 'email_registrado', label: 'E-mail Registrado (AR Digital)' },
    { key: 'email_smtp', label: 'E-mail SMTP' },
    { key: 'email_pdf', label: 'E-mail em PDF' },
  ]},
  { grupo: 'Canais Digitais', itens: [
    { key: 'rcs', label: 'RCS Conversacional' },
    { key: 'enriquecimento', label: 'Enriquecimento de Base' },
    { key: 'valida_mais', label: 'Valida+' },
    { key: 'enriquecimento_premium', label: 'Enriquecimento Premium' },
    { key: 'chatbot', label: 'Chatbot' },
    { key: 'voicebot', label: 'Voicebot / IA de Voz' },
    { key: 'omni_conversas', label: 'Plataforma OMNI' },
  ]},
  { grupo: 'Telecobrança', itens: [
    { key: 'telecobranca_voice_ai', label: 'Telecobrança - Voice AI' },
    { key: 'telecobranca_cross_channel', label: 'Telecobrança - Cross Channel AI' },
    { key: 'telecobranca_expert_human', label: 'Telecobrança - Expert Human' },
  ]},
  { grupo: 'Outros Canais', itens: [
    { key: 'google_meta_ads', label: 'Google / Meta Ads' },
    { key: 'cartas_fisico', label: 'Cartas / Físico' },
    { key: 'telegrama', label: 'Telegrama' },
    { key: 'carne', label: 'Carnê' },
    { key: 'cartorio_documento', label: 'Cartório & Documento Digital' },
    { key: 'landing_page_link', label: 'Landing Page' },
    { key: 'portal_negociacao', label: 'Portal de Negociação' },
  ]},
]

export const CANAIS = CANAIS_GRUPOS.flatMap(g => g.itens)

// Filtra canais desligados pelo Comercial em /config — some do checklist do Discovery,
// mas o label continua resolvível (CANAIS completo) pra qualquer cálculo/proposta já gerada.
export function getCanaisGruposAtivos(config) {
  const desabilitados = new Set(config?.canaisDesabilitados || [])
  return CANAIS_GRUPOS
    .map((g) => ({ ...g, itens: g.itens.filter((i) => !desabilitados.has(i.key)) }))
    .filter((g) => g.itens.length > 0)
}
