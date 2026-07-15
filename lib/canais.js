export const CANAIS_BLOCOS = [
  { bloco: 'Canais de Mensageria', grupos: [
    { grupo: 'SMS', itens: [
      { key: 'sms_texto', label: 'SMS Texto' },
      { key: 'sms_fast_otp', label: 'SMS FAST/OTP' },
      { key: 'sms_rota_exclusiva', label: 'SMS Rota Exclusiva' },
      { key: 'sms_sender_id', label: 'SMS Sender ID' },
      { key: 'sms_flash', label: 'SMS Flash' },
    ]},
    { grupo: 'Email', itens: [
      { key: 'email', label: 'E-mail Simples' },
      { key: 'email_transacional', label: 'E-mail Transacional' },
      { key: 'email_registrado', label: 'E-mail Registrado (AR Digital)' },
      { key: 'email_smtp', label: 'E-mail SMTP' },
      { key: 'email_pdf', label: 'E-mail em PDF' },
    ]},
    { grupo: 'RCS', itens: [
      { key: 'rcs', label: 'RCS Conversacional/Sessão' },
      { key: 'rcs_basico', label: 'RCS Básico' },
      { key: 'rcs_simples', label: 'RCS Simples' },
    ]},
    { grupo: 'WhatsApp', itens: [
      { key: 'whats_ativo', label: 'WhatsApp Ativo' },
      { key: 'whats_receptivo', label: 'WhatsApp Receptivo' },
    ]},
    { grupo: 'Enriquecimento', itens: [
      { key: 'enriquecimento', label: 'Enriquecimento de Base' },
      { key: 'enriquecimento_premium', label: 'Enriquecimento Premium' },
    ]},
    { grupo: 'Landing Page', itens: [
      { key: 'landing_page_link', label: 'Landing Page' },
    ]},
    { grupo: 'Valida+', itens: [
      { key: 'valida_mais', label: 'Valida+' },
    ]},
    { grupo: 'Outros Canais', itens: [
      { key: 'google_meta_ads', label: 'Google / Meta Ads' },
      { key: 'cartas_fisico', label: 'Cartas / Físico' },
      { key: 'telegrama', label: 'Telegrama' },
      { key: 'carne', label: 'Carnê' },
      { key: 'cartorio_documento', label: 'Cartório' },
      { key: 'documento_digital', label: 'Documentos Digital/Files/Link' },
    ]},
  ]},

  { bloco: 'Sistemas/Plataformas', grupos: [
    { grupo: 'ONE', itens: [
      { key: 'one_platform', label: 'ONE Platform' },
    ]},
    { grupo: 'Agentes Digitais', itens: [
      { key: 'chatbot', label: 'Chatbot' },
      { key: 'voicebot', label: 'Voicebot / IA de Voz' },
      { key: 'omni_conversas', label: 'Plataforma OMNI' },
    ]},
    { grupo: 'Portal', itens: [
      { key: 'portal_negociacao', label: 'Portal de Negociação' },
    ]},
  ]},

  { bloco: 'Services', grupos: [
    { grupo: 'Telecobrança', itens: [
      { key: 'telecobranca_voice_ai', label: 'Telecobrança - Voice AI' },
      { key: 'telecobranca_cross_channel', label: 'Telecobrança - Cross Channel AI' },
      { key: 'telecobranca_expert_human', label: 'Telecobrança - Expert Human' },
    ]},
  ]},
]

export const CANAIS_GRUPOS = CANAIS_BLOCOS.flatMap((b) => b.grupos)
export const CANAIS = CANAIS_GRUPOS.flatMap((g) => g.itens)

// Filtra canais desligados pelo Comercial em /config — some do checklist do Discovery,
// mas o label continua resolvível (CANAIS completo) pra qualquer cálculo/proposta já gerada.
export function getCanaisBlocosAtivos(config) {
  const desabilitados = new Set(config?.canaisDesabilitados || [])
  return CANAIS_BLOCOS
    .map((b) => ({
      ...b,
      grupos: b.grupos
        .map((g) => ({ ...g, itens: g.itens.filter((i) => !desabilitados.has(i.key)) }))
        .filter((g) => g.itens.length > 0),
    }))
    .filter((b) => b.grupos.length > 0)
}
