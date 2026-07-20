// Configuração de preços "de fábrica" — usada como valor inicial e como alvo do
// botão "Restaurar Padrão" em /config. Precisa ser um objeto simples (serializável
// em JSON/sessionStorage), por isso faixas sem teto usam max:null em vez de Infinity.

export const PRICING_DEFAULTS = {
  one: {
    basic: { mensal: 3000, limite_cpf: 25000, setup: 5000, excedente: 0.1 },
    plus: { mensal: 5000, limite_cpf: 50000, setup: 5000, excedente: 0.09 },
    enterprise_setup: 20000, // 2x R$10.000 — por portfólio/produto contratado, compartilhado com o Pro
    enterprise_faixas: [
      { min: 0, max: 100000, preco: 0.12 },
      { min: 100000, max: 500000, preco: 0.1 },
      { min: 500000, max: 1000000, preco: 0.08 },
      { min: 1000000, max: null, preco: 0.07 },
    ],
    // ONE PRO — plano paralelo ao Enterprise (aba "ONE Enterprise & Pro"), mesmo setup,
    // faixas de excedente por CPF mais baratas. Escolhido via seletor "Modelo" na calculadora.
    pro_faixas: [
      { min: 0, max: 100000, preco: 0.042 },
      { min: 100000, max: 500000, preco: 0.038 },
      { min: 500000, max: 1000000, preco: 0.034 },
      { min: 1000000, max: null, preco: 0.031 },
    ],
  },

  // Kami — plataforma de bot de voz/texto (aba "Kami"/"KAMI VOZ"). Voz: setup por carteira +
  // script de atendimento + licença por robô (2 perfis). Texto: pacote mensal fechado por
  // franquia de mensagens (mesmo modelo de faixas do E-mail SMTP).
  kami: {
    setup: 24000, // por carteira
    script: 4000, // por script de atendimento — inclui até 20h; hora extra separada
    robo_localizacao: 2500, // por robô/mês
    robo_negociacao: 3500, // por robô/mês
  },

  // WhatsApp Mobile — revenda alternativa do WhatsApp oficial (via parceiro Movily).
  whatsapp_mobile: {
    ativacao: 1500,
    fee_mensal: 800,
    franquia_minima: 10000,
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
    // Kami Texto — pacote mensal fechado por franquia de mensagens (aba "KAMI (2)"). Não modela
    // o excedente por mensagem acima da franquia — só a escolha do pacote pelo volume informado.
    kami_texto: [
      { min: 0, max: 25000, preco: 7500 },
      { min: 25001, max: 50000, preco: 14700 },
      { min: 50001, max: 75000, preco: 21800 },
      { min: 75001, max: 100000, preco: 28800 },
      { min: 100001, max: 300000, preco: 85400 },
      { min: 300001, max: 500000, preco: 140800 },
      { min: 500001, max: 700000, preco: 195800 },
      { min: 700001, max: 900000, preco: 248000 },
      { min: 900001, max: null, preco: 272600 },
    ],
    // WhatsApp Mobile — MT (mensagem enviada pela empresa) e MO (sessão iniciada pelo cliente),
    // preço por unidade decrescente por faixa de volume mensal (aba "WhatsApp Mobile").
    whatsapp_mobile_mt: [
      { min: 0, max: 250000, preco: 0.27 },
      { min: 250001, max: 500000, preco: 0.268 },
      { min: 500001, max: 750000, preco: 0.266 },
      { min: 750001, max: 1000000, preco: 0.263 },
      { min: 1000001, max: null, preco: 0.26 },
    ],
    whatsapp_mobile_mo: [
      { min: 0, max: 250000, preco: 0.07 },
      { min: 250001, max: 500000, preco: 0.06 },
      { min: 500001, max: 750000, preco: 0.05 },
      { min: 750001, max: 1000000, preco: 0.04 },
      { min: 1000001, max: null, preco: 0.03 },
    ],
  },

  setup: {
    chatbot: 18000, // 2x R$9.000
    chatbot_horas_incluidas: 150,
    voicebot: 18000, // 2x R$9.000
    voicebot_horas_incluidas: 180,
    portal_negociacao: 30000, // 2x R$15.000
    portal_negociacao_horas_incluidas: 120,
    landing_page_link: 2000,
    landing_page_link_horas_incluidas: 200,
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
    documento_digital: 0.045, // Documentos Digital/Files/Link (Volume PGFiles + DOC) — mesma aba, valor destacado
    email_transacional_franquia_minima: 350, // piso mensal, mesmo se o pacote da faixa for menor
    hora_desenvolvimento: 250, // R$/h de dev/customização além da carga horária inclusa no setup de cada produto (ver *_horas_incluidas)
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
    carta_fisica: 0, // ← preço a configurar (standby — entra só na geração de proposta, próxima ação)
    smart_contact_phone_score: 0.12, // por consulta
    smart_contact_phone_enriquecimento: 0.15, // por consulta (enriquecimento + score)
    smart_contact_email_score: 0.13, // por consulta
    smart_contact_email_enriquecimento: 0.16, // por consulta (enriquecimento + score)
  },

  // Canais desligados globalmente — somem do checklist do Discovery pra todo mundo na sessão.
  canaisDesabilitados: [],

  // Blocos/cards inteiros do formulário de Discovery desligados — ex: "Régua de Recuperação".
  blocosDesabilitados: [],

  // Notas de contexto/regra de negócio por seção do /config — só admin edita (parte da base
  // geral, publicada pelo mesmo fluxo de "Mudar Base de Preços Geral"), todo mundo lê. Migradas
  // da planilha oficial ("Tabela de Preços Padrões") + esclarecimentos passados diretamente.
  notas: {
    sms: 'Tarifado nos dois sentidos (envio e resposta, MO/MT). Se o cliente optar por disparo + imagem/link + cartório, cobra-se o pacote completo. Envio via SMS Short Code em rotas tradicionais — tempo de entrega pode variar.',
    sms_extra: 'FAST/OTP: preço único, independe de volume — mensagens transacionais (token/senha), rota prioritária, entrega em segundos. Rota Exclusiva: franquia mínima de 300.000 mensagens/mês. Sender ID: número de entrega é substituído pelo nome da empresa (até 9 caracteres). Flash: só operadoras TIM e Claro.',
    email_simples: 'Se o cliente optar por disparo + imagem/link + cartório, cobra-se o pacote completo. Muito usado para disparos em massa (Marketing, Cobrança etc.).',
    email_registrado: 'Franquia mínima mensal de R$2.000,00 — hoje o cálculo só aplica o preço por faixa, sem esse piso.',
    email_smtp: 'Diferente de Transacional e Simples — não usa a plataforma da PGMais. Franquia mínima de R$3.000/mês — hoje o cálculo só aplica o preço por faixa, sem esse piso. Consultar previamente antes de encaminhar proposta.',
    email_extra: 'E-mail Transacional exige mailing próprio "quente" — sem isso há risco de queimar domínio/IP. Fechar essa modalidade específica exige contato direto com a área de Produtos.',
    rcs: 'Básico = texto simples até 160 caracteres, sem multimídia. Simples = conteúdo rico/multimídia (respostas tarifadas pela tabela do Básico). Conversacional/Sessão = primeira mensagem do cliente abre janela de 24h grátis; exige solicitar a construção do agente RCS junto ao Google.',
    whatsapp: 'Setup (R$2.000) cobre solicitação e ativação da conta, validação de templates e parametrizações — custo único, não recorrente.',
    enriquecimento_premium: 'Dado um CPF, retorna todos os celulares pós-pago cadastrados nas operadoras em nome do titular.',
    valida_mais: 'Conectividade com as operadoras para validação de telefone.',
    outros_canais: 'Carnê: comercialização sempre sob consulta prévia (vale pra qualquer venda, não só volume alto). Cartas/Físico: o valor cobre todo o processo (higienização, impressão, postagem, logística reversa) — só elegível a partir de 25.000 postagens/mês.',
    omni: 'Starter e Pro → PME/pequenas operações. Business → SAC estruturado. Enterprise → contact center, mensalidade sob consulta. Setup depende do escopo (integrações, fluxos, treinamento) — requer levantamento prévio da PGMais, aprovação da contratante, e é faturado pelas horas efetivamente executadas.',
    chatbot: 'Franquia mínima de R$4.000/mês equivale a 10.000 atendimentos inclusos (10.000 × R$0,40). Setup inclui até 150h de implantação.',
    voicebot: 'Setup inclui até 180h de implantação. Minutagem de telefonia é cobrada aparte (fixo e móvel) — ainda não entra no cálculo automático.',
    portal_negociacao: 'Setup inclui até 120h de implantação, customizações e integrações.',
    landing_page_link: 'Setup inclui até 200h de customização/desenvolvimento.',
    dev_extra: 'Cada produto (Chatbot, Voicebot, Portal, Landing Page, ONE) tem sua própria quantidade de horas inclusas no setup — não é um pool único compartilhado. Acima da carga horária de cada um, desenvolvimento/customização adicional é cobrado por hora pelo valor abaixo.',
    one_pro: 'Plano paralelo ao ONE Enterprise (mesma aba "ONE Enterprise & Pro", mesmo setup) — faixas de excedente por CPF mais baratas. Escolhido via seletor de modelo na calculadora, para clientes com volume acima do limite do Plus.',
    kami: 'Plataforma de bot de voz/texto. Voz: setup por carteira + script de atendimento (até 20h inclusas, hora extra separada) + licença mensal por robô — "Localização" ou "Negociação". Texto: pacote mensal fechado por franquia de mensagens (excedente por mensagem acima da franquia ainda não entra no cálculo automático).',
    smart_contact: 'Score prioriza/qualifica a base já existente do cliente (telefone ou email). Enriquecimento + Score também adiciona novos contatos validados à base.',
    whatsapp_mobile: 'Revenda alternativa do WhatsApp oficial via parceiro Movily. Ativação (cota única) + fee mensal + franquia mínima, com MT (mensagem enviada pela empresa) e MO (sessão iniciada pelo cliente) tarifados por faixa de volume.',
  },
}
