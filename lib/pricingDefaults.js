// Configuração de preços "de fábrica" — usada como valor inicial e como alvo do
// botão "Restaurar Padrão" em /config. Precisa ser um objeto simples (serializável
// em JSON/sessionStorage), por isso faixas sem teto usam max:null em vez de Infinity.

export const PRICING_DEFAULTS = {
  one: {
    basic: { mensal: 3000, limite_cpf: 25000, setup: 5000, excedente: 0.1 },
    plus: { mensal: 5000, limite_cpf: 50000, setup: 5000, excedente: 0.09 },
    enterprise_setup: 20000, // 2x R$10.000 — por portfólio/produto contratado
    enterprise_faixas: [
      { min: 0, max: 100000, preco: 0.12 },
      { min: 100000, max: 500000, preco: 0.1 },
      { min: 500000, max: 1000000, preco: 0.08 },
      { min: 1000000, max: null, preco: 0.07 },
    ],
  },

  omni: {
    planos: [
      { nome: 'Starter', mensal: 299, conversas: 600, excedente: 0.3 },
      { nome: 'Pro', mensal: 900, conversas: 2000, excedente: 0.3 },
      { nome: 'Business', mensal: 1600, conversas: 4000, excedente: 0.3 },
      { nome: 'Enterprise', mensal: null, conversas: null, excedente: 0.21 },
    ],
  },

  telecobranca: {
    cpfs_por_pa: 3000,
    pa_minimo: 5,
    voice_ai_por_pa: 5200,
    cross_channel_por_pa: 9500,
  },

  faixas: {
    sms: [
      { min: 0, max: 100000, preco: 0.08 },
      { min: 100001, max: 3000000, preco: 0.066 },
      { min: 3000001, max: null, preco: 0.057 },
    ],
    // E-mail Simples (aba "EMAIL SIMPLES" da Tabela de Preços Padrões)
    email: [
      { min: 0, max: 1000000, preco: 0.02 },
      { min: 1000001, max: 5000000, preco: 0.015 },
      { min: 5000001, max: 10000000, preco: 0.0095 },
      { min: 10000001, max: 20000000, preco: 0.0075 },
      { min: 20000001, max: null, preco: 0.0058 },
    ],
    enriquecimento: [
      { min: 0, max: 100000, preco: 0.04 },
      { min: 100001, max: 500000, preco: 0.038 },
      { min: 500001, max: 1000000, preco: 0.036 },
      { min: 1000001, max: 2500000, preco: 0.034 },
      { min: 2500001, max: 5000000, preco: 0.033 },
      { min: 5000001, max: 10000000, preco: 0.029 },
      { min: 10000001, max: null, preco: 0.026 },
    ],
    email_registrado: [
      { min: 0, max: 10000, preco: 0.84 },
      { min: 10001, max: 50000, preco: 0.63 },
      { min: 50001, max: null, preco: 0.49 },
    ],
    // Pacote mensal fechado (não é preço por unidade)
    email_smtp: [
      { min: 0, max: 50000, preco: 850 },
      { min: 50001, max: 100000, preco: 1400 },
      { min: 100001, max: null, preco: 2100 },
    ],
    // E-mail Transacional (aba "Email Transacional" > tabela "PACOTE MENSAL") — cada faixa é um
    // pacote mensal fechado (preco), não preço por unidade. Acima de 100.000, cobra o pacote da
    // última faixa + excedente por unidade sobre o que passar do início dela (100.000).
    email_transacional: [
      { min: 0, max: 50000, preco: 333.89, excedente: 0.03 },
      { min: 50001, max: 100000, preco: 556.48, excedente: 0.025 },
      { min: 100001, max: null, preco: 1112.96, excedente: 0.02 },
    ],
  },

  setup: {
    chatbot: 18000, // 2x R$9.000
    voicebot: 18000, // 2x R$9.000
    portal_negociacao: 30000, // 2x R$15.000
    landing_page_link: 2000,
    rcs: 2000,
    whatsapp: 2000, // conta única — compartilhada entre Ativo e Receptivo
  },

  precos: {
    rcs_conversacional: 0.35, // RCS Conversacional/Sessão
    rcs_basico: 0.0973, // RCS Básico — "Venda" (aba RCS: Preço 0,085 / Custo 0,06 / Custo Interno 0,027 / Venda 0,0973)
    rcs_simples: 0.13, // RCS Simples (conteúdo rico/multimídia)
    chatbot_unit: 0.4, // por atendimento
    chatbot_franquia: 4000, // franquia mínima mensal
    voicebot_unit: 2000, // por robô de atendimento
    voicebot_min_robos: 5,
    telegrama: 70,
    carne: 7.64775, // faixa "até 22 lâminas" da tabela de Correios
    cartorio_documento: 0.2, // Cartório (Chancela Cartorária) — aba "Cartorio & Documento Digital"
    email_transacional_franquia_minima: 350, // piso mensal, mesmo se o pacote da faixa for menor
    whats_ativo_envio: 0.35, // por envio
    whats_receptivo_conversa: 0.025, // por conversa iniciada pelo cliente
    sms_fast_otp: 0.075,
    sms_rota_exclusiva: 0.08,
    sms_sender_id: 0.09,
    sms_flash: 0.09,
    valida_mais: 0.045, // por consulta
    enriquecimento_premium: 0.06, // por consulta
    landing_page_link: 0.02, // por link enviado (exclui custo do canal de disparo)
    portal_negociacao: 15000, // licenciamento mensal
    email_pdf_manutencao: 600,
    email_pdf_geracao: 0.15,
    ads_campanha: 0.13, // por CPF/Email
    ads_franquia: 1500, // franquia mínima por campanha
    google_meta_ads: 0, // ← criativos (R$200/un) não modelados; ver campanha acima
    carta_fisica: 0, // ← preço a configurar
  },

  // Canais desligados globalmente — somem do checklist do Discovery pra todo mundo na sessão.
  canaisDesabilitados: [],

  // Blocos/cards inteiros do formulário de Discovery desligados — ex: "Régua de Recuperação".
  blocosDesabilitados: [],
}
