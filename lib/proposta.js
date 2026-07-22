import { formatMoney, formatMoneyPreciso } from './precificacao'
import { PRICING_DEFAULTS } from './pricingDefaults'

const EMU_POR_POL = 914400
const emu = (polegadas) => Math.round(polegadas * EMU_POR_POL)

// Layout "responsivo" do slide 20 (detalhamento compartilhado): a seção de cada produto ocupa
// sempre a mesma largura (4.76"), então em vez de deixar buracos quando alguma seção é removida,
// as seções que sobram são realocadas em até 2 colunas via bin-packing (LPT — sempre entra na
// coluna com menor altura acumulada), cada coluna centralizada verticalmente, e se só 1 coluna
// sobrar (ex: só 1 seção ativa) ela é centralizada na largura toda do slide.
const SLIDE20_LARGURA_SECAO = emu(4.76)
const SLIDE20_GAP_ITEM = emu(0.18)
const SLIDE20_COL1_X = emu(0.16)
const SLIDE20_COL2_X = emu(5.08)
const SLIDE20_COL_CENTRALIZADA_X = emu((10 - 4.76) / 2)
const SLIDE20_CONTEUDO_TOP = emu(1.05)
const SLIDE20_CONTEUDO_BOTTOM = emu(5.45)

const SLIDE20_SECOES = {
  sms: {
    largura: SLIDE20_LARGURA_SECAO, altura: emu(1.92), ancoraX: emu(0.16), ancoraY: emu(1.53),
    shapes: [
      ['Google Shape;781;p61', 0.16, 1.53], ['Google Shape;782;p61', 0.32, 3.03],
      ['Google Shape;783;p61', 0.32, 2.41], ['Google Shape;784;p61', 1.09, 2.16],
      ['Google Shape;785;p61', 3.23, 2.21], ['Google Shape;791;p61', 3.01, 1.96],
      ['Google Shape;792;p61', 3.01, 2.50], ['Google Shape;793;p61', 0.35, 1.95],
      ['Google Shape;795;p61', 0.32, 2.95],
    ],
  },
  email: {
    largura: SLIDE20_LARGURA_SECAO, altura: emu(1.37), ancoraX: emu(0.16), ancoraY: emu(3.63),
    shapes: [
      ['Google Shape;780;p61', 0.16, 3.63], ['Google Shape;786;p61', 0.30, 4.37],
      ['Google Shape;787;p61', 3.01, 3.92], ['Google Shape;788;p61', 3.01, 4.33],
      ['Google Shape;789;p61', 3.73, 3.92], ['Google Shape;790;p61', 3.73, 4.33],
      ['Google Shape;794;p61', 0.30, 3.99], ['Google Shape;796;p61', 1.07, 4.27],
    ],
  },
  boleto_cartorio: {
    largura: SLIDE20_LARGURA_SECAO, altura: emu(1.35), ancoraX: emu(5.08), ancoraY: emu(1.21),
    shapes: [
      ['Google Shape;798;p61', 5.08, 1.21], ['Google Shape;803;p61', 6.80, 1.56],
      ['Google Shape;804;p61', 5.32, 1.65], ['Google Shape;805;p61', 5.32, 2.07],
      ['Google Shape;806;p61', 7.76, 1.36], ['Google Shape;807;p61', 7.76, 1.64],
      ['Google Shape;808;p61', 7.76, 2.10], ['Google Shape;809;p61', 5.27, 1.36],
    ],
  },
  enriquecimento_valida: {
    largura: SLIDE20_LARGURA_SECAO, altura: emu(1.37), ancoraX: emu(5.07), ancoraY: emu(2.74),
    shapes: [
      ['Google Shape;797;p61', 5.07, 2.74], ['Google Shape;799;p61', 5.30, 3.40],
      ['Google Shape;800;p61', 7.21, 3.33], ['Google Shape;801;p61', 7.76, 3.15],
      ['Google Shape;802;p61', 7.76, 3.39], ['Google Shape;810;p61', 5.29, 3.71],
      ['Google Shape;811;p61', 7.76, 3.71], ['Google Shape;820;p61', 5.27, 2.86],
    ],
  },
  landing_page: {
    largura: SLIDE20_LARGURA_SECAO, altura: emu(1.03), ancoraX: emu(5.07), ancoraY: emu(4.30),
    shapes: [
      ['Google Shape;812;p61', 5.07, 4.30], ['Google Shape;813;p61', 5.20, 4.79],
      ['Google Shape;814;p61', 7.76, 4.57], ['Google Shape;815;p61', 7.76, 4.81],
      ['Google Shape;816;p61', 6.53, 4.76], ['Google Shape;817;p61', 5.20, 4.99],
      ['Google Shape;818;p61', 7.76, 5.00], ['Google Shape;819;p61', 5.27, 4.43],
    ],
  },
}

// Recebe as chaves das seções ativas (na ordem de prioridade visual) e devolve os edits 'move'
// que reposicionam cada shape da seção pra sua nova posição, centralizada.
function layoutResponsivoSlide20(chavesAtivas) {
  const secoes = chavesAtivas.map((chave) => ({ chave, ...SLIDE20_SECOES[chave] }))
  if (!secoes.length) return []

  // Bin-packing LPT: maior seção primeiro, sempre pra coluna com menor altura acumulada até agora.
  const colunas = [{ altura: 0, itens: [] }, { altura: 0, itens: [] }]
  const ordenadas = [...secoes].sort((a, b) => b.altura - a.altura)
  ordenadas.forEach((secao) => {
    const coluna = colunas[0].altura <= colunas[1].altura ? colunas[0] : colunas[1]
    if (coluna.itens.length > 0) coluna.altura += SLIDE20_GAP_ITEM
    coluna.altura += secao.altura
    coluna.itens.push(secao)
  })

  const colunasOcupadas = colunas.filter((c) => c.itens.length > 0)
  const alturaDisponivel = SLIDE20_CONTEUDO_BOTTOM - SLIDE20_CONTEUDO_TOP

  const edits = []
  colunasOcupadas.forEach((coluna, idx) => {
    const x = colunasOcupadas.length === 1
      ? SLIDE20_COL_CENTRALIZADA_X
      : (idx === 0 ? SLIDE20_COL1_X : SLIDE20_COL2_X)
    let y = SLIDE20_CONTEUDO_TOP + Math.max(0, (alturaDisponivel - coluna.altura) / 2)
    coluna.itens.forEach((secao) => {
      const dx = x - secao.ancoraX
      const dy = y - secao.ancoraY
      secao.shapes.forEach(([shape, left, top]) => {
        edits.push({ shape, type: 'move', x: emu(left) + dx, y: emu(top) + dy })
      })
      y += secao.altura + SLIDE20_GAP_ITEM
    })
  })
  return edits
}

// Slides institucionais/fixos do template — sempre entram na proposta.
export const SLIDES_FIXAS = [1, 7, 9, 31]

// 31 é o slide de encerramento — precisa continuar por último mesmo quando um slide condicional
// tem número maior (ex: 33, tabela de referência de Cartas/Físico, adicionada depois do template
// original). Ordenar só por número quebraria essa regra.
const SLIDE_ENCERRAMENTO = 31

// Canal ativo (Discovery) -> slides condicionais do template que devem entrar na proposta.
export const CANAL_SLIDES = {
  one_platform: [10, 11, 12, 13, 14],
  voicebot: [15, 16],
  chatbot: [15, 17],

  // Mensageria: divisor (19) + detalhamento (20) + card-resumo (25), além do detalhamento de cada canal
  sms_texto: [19, 20, 25],
  sms_fast_otp: [19, 20, 25],
  sms_rota_exclusiva: [19, 20, 25],
  sms_sender_id: [19, 20, 25],
  sms_flash: [19, 20, 25],
  email: [19, 20, 25],
  email_registrado: [19, 20, 25],
  email_smtp: [19, 25],
  email_pdf: [19, 25],
  cartorio_documento: [20],
  documento_digital: [20],
  rcs: [19, 23, 25],
  rcs_basico: [19, 23, 25],
  rcs_simples: [19, 23, 25],
  whats_ativo: [19, 21, 25],
  whats_receptivo: [19, 21, 25],
  // 33/34/35 = tabela de referência, 1 slide por tipo (fac_simples/registrada_sem_ar/registrada_com_ar)
  cartas_fisico: [19, 25, 33, 34, 35],
  google_meta_ads: [19, 25],

  // Arquivos/Fatura: divisor (19) + card-resumo (26)
  carne: [19, 26],

  // Portal de Negociação / Landing Page: divisor (27) compartilhado
  portal_negociacao: [27, 28],
  landing_page_link: [20, 27, 29],

  // Dados: detalhamento (20) + card-resumo (30)
  enriquecimento: [20, 30],
  enriquecimento_premium: [20, 30],
  valida_mais: [20, 30],
  smart_contact_phone_score: [30],
  smart_contact_phone_enriquecimento: [30],
  smart_contact_email_score: [30],
  smart_contact_email_enriquecimento: [30],
}

export function getSlidesCondicionais(canaisAtivos) {
  const nums = new Set()
  for (const canal of canaisAtivos) {
    const slides = CANAL_SLIDES[canal]
    if (slides) slides.forEach((n) => nums.add(n))
  }
  return [...nums]
}

export function getSlidesDaProposta(canaisAtivos) {
  return [...new Set([...SLIDES_FIXAS, ...getSlidesCondicionais(canaisAtivos)])].sort((a, b) => {
    if (a === SLIDE_ENCERRAMENTO) return 1
    if (b === SLIDE_ENCERRAMENTO) return -1
    return a - b
  })
}

// Números "grandes" (setup) usam fonte enorme no template — texto precisa ficar curto pra não quebrar linha.
function formatCompacto(valor) {
  return Math.round(valor).toLocaleString('pt-BR')
}

// Mesma precisão de formatMoneyPreciso, sem o prefixo "R$" — pros shapes do template que já
// têm o "R$ " num run separado (ex: RCS Básico/Simples no slide 23).
function formatNumeroPreciso(valor) {
  const [inteiro, decimal] = valor.toFixed(4).split('.')
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal}`
}

function setupONE(planoOne, config) {
  if (planoOne.modelo.includes('Basic')) return config.one.basic.setup
  if (planoOne.modelo.includes('Plus')) return config.one.plus.setup
  return config.one.enterprise_setup
}

function dataHoje() {
  return new Date().toLocaleDateString('pt-BR')
}

// Grupos de shapes por "cartão"/seção removível — extraídos dos mesmos literais usados abaixo
// em getEdicoesPorSlide, só nomeados, pra serem reaproveitados por getMascaras (editor visual)
// sem duplicar as listas e correr o risco de uma ficar desincronizada da outra.
const GRUPO_CARD_EMAIL_PORTAL_14 = ['Google Shape;658;p55', 'Google Shape;659;p55', 'Google Shape;660;p55', 'Google Shape;661;p55', 'Google Shape;667;p55']

const GRUPO_SMS_20 = ['Google Shape;792;p61', 'Google Shape;781;p61', 'Google Shape;782;p61', 'Google Shape;783;p61', 'Google Shape;784;p61', 'Google Shape;785;p61', 'Google Shape;791;p61', 'Google Shape;793;p61', 'Google Shape;795;p61']
const GRUPO_EMAIL_SIMPLES_20 = ['Google Shape;788;p61', 'Google Shape;787;p61']
const GRUPO_EMAIL_REGISTRADO_20 = ['Google Shape;790;p61', 'Google Shape;789;p61']
const GRUPO_EMAIL_BOX_20 = ['Google Shape;780;p61', 'Google Shape;786;p61', 'Google Shape;794;p61', 'Google Shape;796;p61']
const GRUPO_DOC_DIGITAL_20 = ['Google Shape;807;p61', 'Google Shape;804;p61']
const GRUPO_CARTORIO_20 = ['Google Shape;808;p61', 'Google Shape;805;p61']
const GRUPO_DOC_CARTORIO_BOX_20 = ['Google Shape;798;p61', 'Google Shape;803;p61', 'Google Shape;806;p61']
const ICONE_DOC_DIGITAL_20 = 'Google Shape;809;p61'
const GRUPO_ENRIQUECIMENTO_20 = ['Google Shape;802;p61', 'Google Shape;801;p61']
const GRUPO_VALIDA_20 = ['Google Shape;811;p61', 'Google Shape;810;p61']
const GRUPO_ENRIQ_VALIDA_BOX_20 = ['Google Shape;797;p61', 'Google Shape;799;p61', 'Google Shape;800;p61']
const ICONE_ENRIQ_VALIDA_20 = 'Google Shape;820;p61'
const GRUPO_LANDING_20 = ['Google Shape;818;p61', 'Google Shape;812;p61', 'Google Shape;813;p61', 'Google Shape;814;p61', 'Google Shape;815;p61', 'Google Shape;816;p61', 'Google Shape;817;p61', 'Google Shape;819;p61']

const GRUPO_EMAIL_RESUMO_25 = ['Google Shape;1012;p66', 'Google Shape;1011;p66', 'Google Shape;1013;p66', 'Google Shape;1014;p66', 'Google Shape;1019;p66']
const GRUPO_RCS_RESUMO_25 = ['Google Shape;1016;p66', 'Google Shape;1015;p66', 'Google Shape;1017;p66', 'Google Shape;1018;p66', 'Google Shape;1025;p66']
const GRUPO_SMS_RESUMO_25 = ['Google Shape;1021;p66', 'Google Shape;1020;p66', 'Google Shape;1022;p66', 'Google Shape;1023;p66', 'Google Shape;1024;p66']
const GRUPO_CARTAS_RESUMO_25 = ['Google Shape;1027;p66', 'Google Shape;1026;p66', 'Google Shape;1028;p66', 'Google Shape;1029;p66', 'Google Shape;1039;p66']
const GRUPO_ADS_RESUMO_25 = ['Google Shape;1031;p66', 'Google Shape;1030;p66', 'Google Shape;1032;p66', 'Google Shape;1033;p66', 'Google Shape;1040;p66']
const GRUPO_WHATS_RESUMO_25 = ['Google Shape;1035;p66', 'Google Shape;1034;p66', 'Google Shape;1036;p66', 'Google Shape;1037;p66', 'Google Shape;1038;p66']

const GRUPO_SMART_CONTACT_RESUMO_30 = ['Google Shape;1106;p71', 'Google Shape;1105;p71', 'Google Shape;1107;p71', 'Google Shape;1108;p71', 'Google Shape;1122;p71']
const GRUPO_VALIDA_RESUMO_30 = ['Google Shape;1110;p71', 'Google Shape;1109;p71', 'Google Shape;1111;p71', 'Google Shape;1112;p71', 'Google Shape;1123;p71']
const GRUPO_ENRIQUECIMENTO_RESUMO_30 = ['Google Shape;1114;p71', 'Google Shape;1113;p71', 'Google Shape;1115;p71', 'Google Shape;1116;p71', 'Google Shape;1121;p71']
// "Contact Score" (30) e Fatura/Boleto (26) não têm produto modelado — o card é sempre removido,
// não só quando algo específico está inativo, então essas constantes não têm campo/flag associado.
const GRUPO_CONTACT_SCORE_30 = ['Google Shape;1117;p71', 'Google Shape;1118;p71', 'Google Shape;1119;p71', 'Google Shape;1120;p71', 'Google Shape;1124;p71']
const GRUPO_FATURA_26 = ['Google Shape;1050;p67', 'Google Shape;1051;p67', 'Google Shape;1052;p67', 'Google Shape;1053;p67', 'Google Shape;1060;p67']
const GRUPO_BOLETO_26 = ['Google Shape;1054;p67', 'Google Shape;1055;p67', 'Google Shape;1056;p67', 'Google Shape;1057;p67', 'Google Shape;1058;p67']

// Slides 33/34/35 do template — 1 por tipo de Carta/Físico (desenhados à mão pelo usuário,
// reaproveitados tal e qual; ver templates/proposta-template.pptx).
const SLIDE_CARTAS_POR_TIPO = { fac_simples: 33, registrada_sem_ar: 34, registrada_com_ar: 35 }

// Extrai de result/discovery/config todo texto/preço que hoje é escrito diretamente nos slides,
// como uma lista de "campos editáveis" com id lógico estável — usada tanto pela tela de revisão
// (getCampos) quanto por getEdicoesPorSlide, que aplica os overrides do usuário por cima do valor
// calculado aqui antes de montar os edits de XML. `flags` carrega as condições estruturais
// (mostrar/remover card, layout) que os overrides NÃO afetam — só o texto final muda.
function computeCampos(result, discovery, config) {
  const ativo = (k) => discovery.canais_ativos.includes(k)
  const campos = []
  // `shapes` são os shapes usados pra posicionar o(s) overlay(s) no editor visual — pra campos com
  // dedup entre 2 slides (ex. preco_sms), inclui os DOIS, pra editar (ou só visualizar o valor já
  // preenchido) em qualquer um dos dois lugares, sempre em sincronia (mesmo id de campo). Os 3
  // campos de Identificação não têm shape (não têm mapeamento 1:1 com uma única caixa de texto)
  // e ficam de fora do overlay. `one_total_mensal` só lista o shape do card isolado (slide 14) —
  // a menção no slide 13 está embutida numa frase ("RECORRENTE: X/mês"), sem uma caixa só do
  // número pra sobrepor um input.
  // `run` é o índice do run de texto que esse campo edita dentro do shape (ver getEdicoesPorSlide)
  // — o editor visual usa isso pra saber qual dos dois tamanhos de fonte extraídos do template
  // (primeiro/último caractere) é o do VALOR, não o de um rótulo colado depois no mesmo shape.
  const add = (id, group, label, value, shape, run = 0) => campos.push({ id, group, label, value, shapes: shape ? (Array.isArray(shape) ? shape : [shape]) : [], run })
  const flags = {}

  add('nome_cliente', 'Identificação', 'Nome do Cliente', discovery.nomeCliente || 'Cliente')
  add('numero_proposta', 'Identificação', 'Número da Proposta', discovery.numeroProposta || '000')
  add('data_proposta', 'Identificação', 'Data da Proposta', discovery.dataProposta || dataHoje())

  if (ativo('one_platform')) {
    add('one_setup', 'ONE Platform', 'Setup ONE Platform (R$)', formatCompacto(setupONE(result.plano_one, config)), 'Google Shape;647;p54', 1)
    add('one_total_mensal', 'ONE Platform', 'Recorrente Mensal ONE Platform', formatMoney(result.plano_one.total_mensal), 'Google Shape;663;p55')
    flags.emailOuPortalAtivo = ativo('email') || ativo('portal_negociacao')
    if (flags.emailOuPortalAtivo) {
      const precoEmailMassivoPortal = (ativo('email') ? result.orcamentos.email : 0)
        + (ativo('portal_negociacao') ? result.orcamentos.portal_negociacao : 0)
      add('one_email_portal_mensal', 'ONE Platform', 'E-mail Massivo + Portal (mensal)', formatMoney(precoEmailMassivoPortal), 'Google Shape;659;p55')
    }
  }

  if (ativo('voicebot')) {
    add('voicebot_setup', 'Voicebot', 'Setup Voicebot (R$)', formatCompacto(config.setup.voicebot), 'Google Shape;702;p57', 1)
    add('voicebot_valor_por_robo', 'Voicebot', 'Valor por Robô Extra', formatMoney(2000), 'Google Shape;688;p57', 1)
    add('voicebot_limite_conversas', 'Voicebot', 'Limite de Conversas por Robô', '200', 'Google Shape;717;p57', 1)
  }

  if (ativo('chatbot')) {
    add('chatbot_setup', 'Chatbot', 'Setup Chatbot (R$)', formatCompacto(config.setup.chatbot), 'Google Shape;736;p58', 1)
    add('chatbot_franquia', 'Chatbot', 'Franquia de Negociações', '4.000', 'Google Shape;731;p58')
    add('chatbot_preco_negociacao', 'Chatbot', 'Preço por Negociação Extra', '0,40', 'Google Shape;752;p58', 1)
  }

  flags.smsAtivoSlide20 = ['sms_texto', 'sms_fast_otp', 'sms_rota_exclusiva', 'sms_sender_id', 'sms_flash'].some(ativo)
  if (flags.smsAtivoSlide20) add('preco_sms', 'Detalhamento de Canais', 'SMS — preço unitário', formatMoneyPreciso(result.precos.sms), ['Google Shape;792;p61', 'Google Shape;1021;p66'])

  flags.emailSimplesAtivo = ativo('email')
  flags.emailRegistradoAtivo = ativo('email_registrado')
  if (flags.emailSimplesAtivo) add('preco_email', 'Detalhamento de Canais', 'E-mail Simples — preço unitário', formatMoneyPreciso(result.precos.email), 'Google Shape;788;p61')
  if (flags.emailRegistradoAtivo) add('preco_email_registrado', 'Detalhamento de Canais', 'E-mail Registrado — preço unitário', formatMoneyPreciso(result.precos.email_registrado), 'Google Shape;790;p61')

  flags.documentoDigitalAtivo = ativo('documento_digital')
  flags.cartorioAtivo = ativo('cartorio_documento')
  if (flags.documentoDigitalAtivo) add('preco_documento_digital', 'Detalhamento de Canais', 'Documento Digital — preço unitário', formatMoneyPreciso(result.precos.documento_digital), 'Google Shape;807;p61')
  if (flags.cartorioAtivo) add('preco_cartorio_documento', 'Detalhamento de Canais', 'Cartório — preço unitário', formatMoneyPreciso(result.precos.cartorio_documento), 'Google Shape;808;p61')

  // Enriquecimento e Valida+ aparecem em DOIS slides (20 e 30) com o mesmo valor — um único campo
  // alimenta as duas edições, então um override aqui atualiza os dois lugares de uma vez.
  flags.precoEnriquecimentoAtivo = ativo('enriquecimento_premium') ? result.precos.enriquecimento_premium : ativo('enriquecimento') ? result.precos.enriquecimento : null
  if (flags.precoEnriquecimentoAtivo !== null) {
    add('preco_enriquecimento_ativo', 'Detalhamento de Canais', ativo('enriquecimento_premium') ? 'Enriquecimento Premium — preço' : 'Enriquecimento — preço', formatMoneyPreciso(flags.precoEnriquecimentoAtivo), ['Google Shape;802;p61', 'Google Shape;1114;p71'])
  }

  flags.validaAtivoSlide20 = ativo('valida_mais')
  if (flags.validaAtivoSlide20) add('preco_valida_mais', 'Detalhamento de Canais', 'Valida+ — preço unitário', formatMoneyPreciso(result.precos.valida_mais), ['Google Shape;811;p61', 'Google Shape;1110;p71'])

  flags.landingAtivoSlide20 = ativo('landing_page_link')
  if (flags.landingAtivoSlide20) add('preco_landing_page_link', 'Detalhamento de Canais', 'Landing Page — preço por link (detalhamento)', formatMoneyPreciso(result.precos.landing_page_link), 'Google Shape;818;p61')

  // RCS — 923/930 no slide 23 (detalhamento, sem "R$") não são o mesmo valor do card-resumo do
  // slide 25 (que mostra só 1 preço via fallback rcs > básico > simples): são 3 campos distintos.
  if (ativo('rcs') || ativo('rcs_basico') || ativo('rcs_simples')) {
    if (ativo('rcs_basico')) add('rcs_basico_detalhe', 'RCS', 'RCS Básico — preço (detalhamento)', formatNumeroPreciso(result.precos.rcs_basico), 'Google Shape;923;p64', 1)
    if (ativo('rcs_simples')) add('rcs_simples_detalhe', 'RCS', 'RCS Simples — preço (detalhamento)', formatNumeroPreciso(result.precos.rcs_simples), 'Google Shape;930;p64', 1)
  }

  if (ativo('whats_ativo') || ativo('whats_receptivo')) {
    add('whatsapp_setup', 'WhatsApp', 'Setup WhatsApp (R$)', formatCompacto(config.setup.whatsapp), 'Google Shape;833;p62', 1)
    add('whatsapp_preco_mt', 'WhatsApp', 'Preço MT (mensagem enviada pela empresa)', '0,18', 'Google Shape;843;p62', 1)
    add('whatsapp_preco_mo', 'WhatsApp', 'Preço MO (sessão iniciada pelo cliente)', '0,18', 'Google Shape;844;p62', 1)
  }

  if (ativo('portal_negociacao')) {
    add('portal_setup', 'Portal de Negociação', 'Setup Portal de Negociação', formatMoney(config.setup.portal_negociacao), 'Google Shape;1081;p69', 1)
    add('portal_limite_criacao', 'Portal de Negociação', 'Limite de Criação (linhas)', '15.000', 'Google Shape;1084;p69', 1)
  }

  if (ativo('landing_page_link')) {
    add('landing_setup', 'Landing Page', 'Setup Landing Page', formatMoney(config.setup.landing_page_link), 'Google Shape;1094;p70', 1)
    add('landing_valor_por_link', 'Landing Page', 'Valor por Link (slide dedicado)', '0,02', 'Google Shape;1097;p70', 1)
  }

  if (ativo('carne')) {
    add('preco_carne', 'Carnê', 'Carnê — preço unitário', formatMoneyPreciso(result.precos.carne), 'Google Shape;1047;p67')
  }

  // Card-resumo (slide 25/30) — cada família mostra só o preço do canal "vencedor" do fallback.
  flags.precoEmailResumo = flags.emailSimplesAtivo ? result.precos.email
    : flags.emailRegistradoAtivo ? result.precos.email_registrado
    : ativo('email_pdf') ? result.precos.email_pdf
    : ativo('email_smtp') ? result.precos.email_smtp
    : null
  if (flags.precoEmailResumo !== null) add('preco_email_resumo', 'Card-Resumo', 'E-mail (card-resumo) — preço', formatMoneyPreciso(flags.precoEmailResumo), 'Google Shape;1012;p66')

  flags.precoRcsResumo = ativo('rcs') ? result.precos.rcs
    : ativo('rcs_basico') ? result.precos.rcs_basico
    : ativo('rcs_simples') ? result.precos.rcs_simples
    : null
  if (flags.precoRcsResumo !== null) add('preco_rcs_resumo', 'Card-Resumo', 'RCS (card-resumo) — preço', formatMoneyPreciso(flags.precoRcsResumo), 'Google Shape;1016;p66')

  if (ativo('cartas_fisico')) add('preco_cartas_fisico_resumo', 'Card-Resumo', 'Cartas/Físico (card-resumo) — a partir de', formatMoney(config.cartasFisico.fac_simples.A4['1x1']), 'Google Shape;1027;p66')

  if (ativo('google_meta_ads')) add('preco_google_meta_ads', 'Card-Resumo', 'Google / Meta Ads — preço', formatMoneyPreciso(result.precos.google_meta_ads), 'Google Shape;1031;p66')

  flags.precoWhatsResumo = ativo('whats_ativo') ? result.precos.whats_ativo : ativo('whats_receptivo') ? result.precos.whats_receptivo : null
  if (flags.precoWhatsResumo !== null) add('preco_whats_resumo', 'Card-Resumo', 'WhatsApp (card-resumo) — preço', formatMoneyPreciso(flags.precoWhatsResumo), 'Google Shape;1035;p66')

  flags.precoSmartContactResumo = ativo('smart_contact_phone_score') ? result.precos.smart_contact_phone_score
    : ativo('smart_contact_phone_enriquecimento') ? result.precos.smart_contact_phone_enriquecimento
    : ativo('smart_contact_email_score') ? result.precos.smart_contact_email_score
    : ativo('smart_contact_email_enriquecimento') ? result.precos.smart_contact_email_enriquecimento
    : null
  if (flags.precoSmartContactResumo !== null) add('preco_smart_contact_resumo', 'Card-Resumo', 'Smart Contact (card-resumo) — preço', formatMoneyPreciso(flags.precoSmartContactResumo), 'Google Shape;1106;p71')

  return { campos, flags }
}

// Campos editáveis pra tela de revisão — mesmo cálculo usado por getEdicoesPorSlide, sem gerar PPTX.
export function getCampos(result, discovery, config = PRICING_DEFAULTS) {
  return computeCampos(result, discovery, config).campos
}

// Textos que dependem do config mas NÃO devem virar campo editável na tela de revisão — só
// refletem o valor visualmente (sem input por cima). Ex.: a nota de horas inclusas no setup do
// ONE Platform (slide 13) é ajustável em /config, mas não faz sentido editar por proposta.
export function getTextosFixos(config = PRICING_DEFAULTS) {
  return [
    {
      shape: 'Google Shape;648;p54',
      text: `* Está incluso no setup até ${Math.round(config.setup.one_horas_incluidas)} horas de implantação. Horas adicionais serão faturados no item SERVIÇOS PROFISSIONAIS`,
    },
    {
      shape: 'Google Shape;651;p54',
      text: `FRANQUIA MÍNIMA ${formatMoney(config.setup.one_franquia_minima)}`,
    },
  ]
}

// Seções/cards que ficam de fora da proposta (mesmas condições de getEdicoesPorSlide, reaproveitando
// os grupos de shapes acima) — usado pelo editor visual pra desenhar uma máscara cinza sobre a área
// que não vai entrar no PPTX final. Só retorna as entradas que precisam de máscara (produto inativo).
export function getMascaras(result, discovery, config = PRICING_DEFAULTS) {
  const ativo = (k) => discovery.canais_ativos.includes(k)
  const { flags } = computeCampos(result, discovery, config)
  const mascaras = []
  const add = (slide, active, shapes) => mascaras.push({ slide, active, shapes })

  if (ativo('one_platform')) {
    add(14, flags.emailOuPortalAtivo, GRUPO_CARD_EMAIL_PORTAL_14)
  }

  const enriquecimentoAtivo = flags.precoEnriquecimentoAtivo !== null
  add(20, flags.smsAtivoSlide20, GRUPO_SMS_20)
  add(20, flags.emailSimplesAtivo, GRUPO_EMAIL_SIMPLES_20)
  add(20, flags.emailRegistradoAtivo, GRUPO_EMAIL_REGISTRADO_20)
  add(20, flags.emailSimplesAtivo || flags.emailRegistradoAtivo, GRUPO_EMAIL_BOX_20)
  add(20, flags.documentoDigitalAtivo, [...GRUPO_DOC_DIGITAL_20, ICONE_DOC_DIGITAL_20])
  add(20, flags.cartorioAtivo, GRUPO_CARTORIO_20)
  add(20, flags.documentoDigitalAtivo || flags.cartorioAtivo, GRUPO_DOC_CARTORIO_BOX_20)
  add(20, enriquecimentoAtivo, GRUPO_ENRIQUECIMENTO_20)
  add(20, flags.validaAtivoSlide20, GRUPO_VALIDA_20)
  add(20, enriquecimentoAtivo || flags.validaAtivoSlide20, GRUPO_ENRIQ_VALIDA_BOX_20)
  add(20, enriquecimentoAtivo && flags.validaAtivoSlide20, [ICONE_ENRIQ_VALIDA_20])
  add(20, flags.landingAtivoSlide20, GRUPO_LANDING_20)

  add(25, flags.precoEmailResumo !== null, GRUPO_EMAIL_RESUMO_25)
  add(25, flags.precoRcsResumo !== null, GRUPO_RCS_RESUMO_25)
  add(25, flags.smsAtivoSlide20, GRUPO_SMS_RESUMO_25)
  add(25, ativo('cartas_fisico'), GRUPO_CARTAS_RESUMO_25)
  add(25, ativo('google_meta_ads'), GRUPO_ADS_RESUMO_25)
  add(25, flags.precoWhatsResumo !== null, GRUPO_WHATS_RESUMO_25)

  if (flags.precoSmartContactResumo !== null || flags.validaAtivoSlide20 || enriquecimentoAtivo) {
    add(30, flags.precoSmartContactResumo !== null, GRUPO_SMART_CONTACT_RESUMO_30)
    add(30, flags.validaAtivoSlide20, GRUPO_VALIDA_RESUMO_30)
    add(30, enriquecimentoAtivo, GRUPO_ENRIQUECIMENTO_RESUMO_30)
    // "Contact Score" nunca tem produto modelado — o card é sempre removido nesse slide.
    add(30, false, GRUPO_CONTACT_SCORE_30)
  }

  if (ativo('carne')) {
    // Fatura e Boleto também não são modelados — sempre removidos quando o slide 26 aparece.
    add(26, false, GRUPO_FATURA_26)
    add(26, false, GRUPO_BOLETO_26)
  }

  return mascaras.filter((m) => !m.active).map(({ slide, shapes }) => ({ slide, shapes }))
}

// Cada edição referencia um shape do template pelo nome exato ("Google Shape;NNN;pXX").
// type 'run' seta o texto de um run específico (por índice) sem afetar os demais.
// type 'replace' faz uma substituição de substring dentro do texto já existente do shape.
// `overrides` (map id de campo -> texto) pisa no valor calculado por computeCampos antes de
// entrar nos edits — a lógica estrutural (remove/resize/move/layout) nunca usa overrides.
export function getEdicoesPorSlide(result, discovery, config = PRICING_DEFAULTS, overrides = {}) {
  const ativo = (k) => discovery.canais_ativos.includes(k)
  const edicoes = {}
  const add = (slide, list) => { edicoes[slide] = [...(edicoes[slide] || []), ...list] }

  const { campos, flags } = computeCampos(result, discovery, config)
  const camposMap = Object.fromEntries(campos.map((c) => [c.id, c]))
  const val = (id) => overrides[id] ?? camposMap[id]?.value ?? ''

  // Card de um "PG+..." card-resumo (fundo + preço + ícone + label) — se o produto não estiver
  // ativo, remove o card inteiro em vez de só limpar o texto do preço, senão sobra uma caixa
  // vazia no meio do slide pra algo que nem foi cotado.
  const cardOuRemove = (isActive, precoShape, precoTexto, outrosShapes) => {
    if (isActive) return [{ shape: precoShape, type: 'run', run: 0, text: precoTexto }]
    return [precoShape, ...outrosShapes].map((shape) => ({ shape, type: 'remove' }))
  }

  add(1, [
    { shape: 'Google Shape;232;p42', type: 'run', run: 0, text: `Proposta Nº ${val('numero_proposta')} | ${val('nome_cliente')}` },
    { shape: 'Google Shape;233;p42', type: 'run', run: 0, text: `${val('data_proposta')}   ` },
  ])

  // Título "Smart Journey Collection" quebra linha de forma feia no template original — alarga a caixa.
  add(9, [
    { shape: 'Google Shape;509;p50', type: 'resize', cx: 4200000 },
  ])

  if (ativo('one_platform')) {
    // Slide 13 — detalhamento SETUP/RECORRENTE do ONE Collect.
    add(13, [
      { shape: 'Google Shape;647;p54', type: 'run', run: 0, text: 'R$ ' },
      { shape: 'Google Shape;647;p54', type: 'run', run: 1, text: val('one_setup') },
      { shape: 'Google Shape;645;p54', type: 'run', run: 0, text: `RECORRENTE: ${val('one_total_mensal')}/mês` },
      { shape: 'Google Shape;640;p54', type: 'replace', from: 'R$XXXXX', to: `R$${formatCompacto(config.precos.hora_desenvolvimento)}` },
      // Horas inclusas no setup e franquia mínima — dinâmicos via config, mas fora do sistema de
      // campos/overrides de propósito (não devem aparecer editáveis na tela de revisão, só
      // refletir o valor do /config).
      { shape: 'Google Shape;648;p54', type: 'replace', from: '200 horas', to: `${Math.round(config.setup.one_horas_incluidas)} horas` },
      { shape: 'Google Shape;651;p54', type: 'replace', from: 'R$ XXXXX', to: formatMoney(config.setup.one_franquia_minima) },
      // 640 (parágrafo) começa em T=4.53" mas 639 ("SERVIÇOS PROFISSIONAIS") só termina em
      // T=4.59" — sobreposição de 0.06" no template original, por isso o texto fica colado
      // no título. Desloca o parágrafo pra abaixo do título.
      { shape: 'Google Shape;640;p54', type: 'move', y: emu(4.65) },
    ])
    add(14, [
      { shape: 'Google Shape;663;p55', type: 'run', run: 0, text: val('one_total_mensal') },
    ])
    // Segundo card do mesmo slide ("E+mail Massivo + Portal") — soma o que estiver ativo dos
    // dois. Se nenhum dos dois foi selecionado, o card inteiro (fundo + ícone + label + preço)
    // é removido do slide — não basta limpar o texto, senão sobra uma caixa vazia. A condição
    // de remoção usa a SELEÇÃO (ativo), não o valor calculado — um produto selecionado com
    // volume zerado ainda é "ativo" e deve manter o card (mesmo mostrando R$0,00).
    if (flags.emailOuPortalAtivo) {
      add(14, [{ shape: 'Google Shape;659;p55', type: 'run', run: 0, text: val('one_email_portal_mensal') }])
    } else {
      add(14, GRUPO_CARD_EMAIL_PORTAL_14.map((shape) => ({ shape, type: 'remove' })))
    }
  }

  if (ativo('voicebot')) {
    add(16, [
      { shape: 'Google Shape;702;p57', type: 'run', run: 0, text: 'R$ ' },
      { shape: 'Google Shape;702;p57', type: 'run', run: 1, text: val('voicebot_setup') },
      { shape: 'Google Shape;688;p57', type: 'run', run: 1, text: `POR ROBÔ: ${val('voicebot_valor_por_robo')} ` },
      { shape: 'Google Shape;717;p57', type: 'run', run: 1, text: val('voicebot_limite_conversas') },
    ])
  }

  if (ativo('chatbot')) {
    add(17, [
      { shape: 'Google Shape;736;p58', type: 'run', run: 0, text: 'R$ ' },
      { shape: 'Google Shape;736;p58', type: 'run', run: 1, text: val('chatbot_setup') },
      { shape: 'Google Shape;731;p58', type: 'replace', from: '5.000', to: val('chatbot_franquia') },
      { shape: 'Google Shape;752;p58', type: 'run', run: 1, text: val('chatbot_preco_negociacao') },
    ])
  }

  // Slide 20 — "pg channels" (detalhamento): SMS / Email Simples / Email c/ Documento / Boleto Digital /
  // Registro Cartório / Enriquecimento / Valida+ / Landing Page, todos no MESMO slide. Entra se
  // QUALQUER um destes canais estiver ativo (CANAL_SLIDES) — ex: só Landing Page já traz o slide
  // inteiro. Cada seção (caixa + descrição + preço) é removida por completo se o(s) produto(s)
  // dela não estiverem ativos — não só o texto do preço, senão sobra a descrição e o ícone de um
  // produto que nem foi cotado.
  const smsAtivoSlide20 = flags.smsAtivoSlide20
  const emailSimplesAtivo = flags.emailSimplesAtivo
  const emailRegistradoAtivo = flags.emailRegistradoAtivo
  const documentoDigitalAtivo = flags.documentoDigitalAtivo
  const cartorioAtivo = flags.cartorioAtivo
  const enriquecimentoAtivoSlide20 = flags.precoEnriquecimentoAtivo !== null
  const validaAtivoSlide20 = flags.validaAtivoSlide20
  const landingAtivoSlide20 = flags.landingAtivoSlide20

  // SMS — seção própria (781/782/783/784/785/791/793/795 + preço 792)
  add(20, cardOuRemove(smsAtivoSlide20, GRUPO_SMS_20[0], val('preco_sms'), GRUPO_SMS_20.slice(1)))

  // Email Simples e Email c/ Documento (Registrado) compartilham uma caixa (780/786/794/796) —
  // cada um remove só o próprio label+preço; a caixa/descrição/ícone comuns só saem se os dois
  // estiverem inativos.
  add(20, cardOuRemove(emailSimplesAtivo, GRUPO_EMAIL_SIMPLES_20[0], val('preco_email'), GRUPO_EMAIL_SIMPLES_20.slice(1)))
  add(20, cardOuRemove(emailRegistradoAtivo, GRUPO_EMAIL_REGISTRADO_20[0], val('preco_email_registrado'), GRUPO_EMAIL_REGISTRADO_20.slice(1)))
  if (!emailSimplesAtivo && !emailRegistradoAtivo) {
    add(20, GRUPO_EMAIL_BOX_20.map((shape) => ({ shape, type: 'remove' })))
  }

  // Boleto Digital (documento_digital) e Registro Cartório compartilham uma caixa (798/803/806).
  // O ícone 809 é uma imagem com o nome "DOC DIGITAL" — é específico do Boleto Digital, não um
  // rótulo genérico pra caixa toda, então só pode aparecer quando esse produto estiver ativo
  // (senão mostra "+DOC DIGITAL" em cima do conteúdo de Cartório, que é outro produto).
  add(20, cardOuRemove(documentoDigitalAtivo, GRUPO_DOC_DIGITAL_20[0], val('preco_documento_digital'), GRUPO_DOC_DIGITAL_20.slice(1)))
  add(20, cardOuRemove(cartorioAtivo, GRUPO_CARTORIO_20[0], val('preco_cartorio_documento'), GRUPO_CARTORIO_20.slice(1)))
  if (!documentoDigitalAtivo && !cartorioAtivo) {
    add(20, [...GRUPO_DOC_CARTORIO_BOX_20, ICONE_DOC_DIGITAL_20].map((shape) => ({ shape, type: 'remove' })))
  } else if (!documentoDigitalAtivo) {
    add(20, [{ shape: ICONE_DOC_DIGITAL_20, type: 'remove' }])
  }

  // Enriquecimento e Valida+ compartilham uma caixa (797/799/800). O ícone 820 é uma ÚNICA
  // imagem com os dois nomes escritos juntos ("+ENRIQUECIMENTO"/"+VALIDA") — não dá pra mostrar
  // só um nome de dentro da imagem, então ele só aparece quando os DOIS estiverem ativos; com só
  // um dos dois, some o ícone mas "Dados de Contato" + o preço certo continuam.
  add(20, cardOuRemove(enriquecimentoAtivoSlide20, GRUPO_ENRIQUECIMENTO_20[0], val('preco_enriquecimento_ativo'), GRUPO_ENRIQUECIMENTO_20.slice(1)))
  add(20, cardOuRemove(validaAtivoSlide20, GRUPO_VALIDA_20[0], val('preco_valida_mais'), GRUPO_VALIDA_20.slice(1)))
  if (!enriquecimentoAtivoSlide20 && !validaAtivoSlide20) {
    add(20, [...GRUPO_ENRIQ_VALIDA_BOX_20, ICONE_ENRIQ_VALIDA_20].map((shape) => ({ shape, type: 'remove' })))
  } else if (!(enriquecimentoAtivoSlide20 && validaAtivoSlide20)) {
    add(20, [{ shape: ICONE_ENRIQ_VALIDA_20, type: 'remove' }])
  }

  // Landing Page — seção própria (812/813/814/815/816/817/819 + preço 818).
  add(20, cardOuRemove(landingAtivoSlide20, GRUPO_LANDING_20[0], val('preco_landing_page_link'), GRUPO_LANDING_20.slice(1)))

  // As caixas de "VALOR UNITÁRIO" e de preço nesse slide são estreitas demais pro próprio
  // conteúdo (ex: "R$ 0,0800" não cabe numa caixa de 0.43-0.50") e quebram em 2 linhas — alarga
  // mantendo a posição (left-aligned, com espaço livre à direita dentro de cada seção).
  add(20, [
    { shape: 'Google Shape;791;p61', type: 'resize', cx: emu(1.3) },
    { shape: 'Google Shape;792;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;787;p61', type: 'resize', cx: emu(0.65) },
    { shape: 'Google Shape;788;p61', type: 'resize', cx: emu(0.65) },
    { shape: 'Google Shape;790;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;801;p61', type: 'resize', cx: emu(1.3) },
    { shape: 'Google Shape;802;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;811;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;806;p61', type: 'resize', cx: emu(1.3) },
    { shape: 'Google Shape;807;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;808;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;814;p61', type: 'resize', cx: emu(1.3) },
    { shape: 'Google Shape;815;p61', type: 'resize', cx: emu(0.9) },
    { shape: 'Google Shape;818;p61', type: 'resize', cx: emu(0.9) },
  ])

  // Reposiciona as seções que sobraram nesse slide — sem isso, cada seção removida deixa um
  // buraco vazio no lugar onde ela estava.
  add(20, layoutResponsivoSlide20([
    ['boleto_cartorio', documentoDigitalAtivo || cartorioAtivo],
    ['sms', smsAtivoSlide20],
    ['enriquecimento_valida', enriquecimentoAtivoSlide20 || validaAtivoSlide20],
    ['email', emailSimplesAtivo || emailRegistradoAtivo],
    ['landing_page', landingAtivoSlide20],
  ].filter(([, ativo]) => ativo).map(([chave]) => chave)))

  if (ativo('whats_ativo') || ativo('whats_receptivo')) {
    add(21, [
      { shape: 'Google Shape;833;p62', type: 'run', run: 1, text: val('whatsapp_setup') },
      { shape: 'Google Shape;843;p62', type: 'run', run: 1, text: val('whatsapp_preco_mt') },
      { shape: 'Google Shape;844;p62', type: 'run', run: 1, text: val('whatsapp_preco_mo') },
    ])
  }

  // Slide 23 — detalhamento RCS: 923 = Básico, 930 = Simples. Sem placeholder de Conversacional/
  // Sessão no template — só entra na proposta via slide 25 (card-resumo), não aqui.
  if (ativo('rcs') || ativo('rcs_basico') || ativo('rcs_simples')) {
    add(23, [
      { shape: 'Google Shape;923;p64', type: 'run', run: 1, text: ativo('rcs_basico') ? val('rcs_basico_detalhe') : '' },
      { shape: 'Google Shape;930;p64', type: 'run', run: 1, text: ativo('rcs_simples') ? val('rcs_simples_detalhe') : '' },
    ])
  }

  if (ativo('portal_negociacao')) {
    add(28, [
      { shape: 'Google Shape;1081;p69', type: 'run', run: 0, text: '' },
      { shape: 'Google Shape;1081;p69', type: 'run', run: 1, text: val('portal_setup') },
      { shape: 'Google Shape;1084;p69', type: 'run', run: 1, text: val('portal_limite_criacao') },
    ])
  }

  if (ativo('landing_page_link')) {
    add(29, [
      { shape: 'Google Shape;1094;p70', type: 'run', run: 0, text: '' },
      { shape: 'Google Shape;1094;p70', type: 'run', run: 1, text: val('landing_setup') },
      { shape: 'Google Shape;1092;p70', type: 'run', run: 0, text: 'VALOR POR LINK' },
      { shape: 'Google Shape;1097;p70', type: 'run', run: 1, text: val('landing_valor_por_link') },
      { shape: 'Google Shape;1098;p70', type: 'run', run: 0, text: 'Sem franquia mínima' },
    ])
  }

  // Slide 25 — card-resumo "PG+CHANNELS" (E-mail / RCS / SMS / Carta / ADS / Whats). Esse slide
  // entra na proposta se QUALQUER UM dos 6 canais estiver ativo (ver CANAL_SLIDES) — os canais
  // que não foram selecionados têm o card inteiro (fundo + ícone + label + preço) removido, não
  // só o texto — senão sobra uma caixa vazia no meio do slide.
  add(25, cardOuRemove(flags.precoEmailResumo !== null, GRUPO_EMAIL_RESUMO_25[0], val('preco_email_resumo'), GRUPO_EMAIL_RESUMO_25.slice(1)))
  add(25, cardOuRemove(flags.precoRcsResumo !== null, GRUPO_RCS_RESUMO_25[0], val('preco_rcs_resumo'), GRUPO_RCS_RESUMO_25.slice(1)))
  add(25, cardOuRemove(smsAtivoSlide20, GRUPO_SMS_RESUMO_25[0], val('preco_sms'), GRUPO_SMS_RESUMO_25.slice(1)))

  // Card-resumo mostra "a partir de" (o mais barato dos tipos listados na tabela de referência
  // do slide 33) — o preço real varia até 24x por tipo/formato/impressão, então não dá pra
  // reduzir a um único valor "correto"; ver tabela completa no slide 33.
  add(25, cardOuRemove(ativo('cartas_fisico'), GRUPO_CARTAS_RESUMO_25[0], val('preco_cartas_fisico_resumo'), GRUPO_CARTAS_RESUMO_25.slice(1)))
  add(25, cardOuRemove(ativo('google_meta_ads'), GRUPO_ADS_RESUMO_25[0], val('preco_google_meta_ads'), GRUPO_ADS_RESUMO_25.slice(1)))
  add(25, cardOuRemove(flags.precoWhatsResumo !== null, GRUPO_WHATS_RESUMO_25[0], val('preco_whats_resumo'), GRUPO_WHATS_RESUMO_25.slice(1)))

  // Slides 33/34/35 — tabela de referência de Cartas/Físico, 1 slide por tipo (fac_simples,
  // registrada_sem_ar, registrada_com_ar — MDP-Básica fora por decisão), reaproveitando o design
  // feito à mão pelo usuário (copiado de templates/proposta-template.pptx). Cada slide tem 8
  // shapes de preço (2 formatos x 4 combinações), nomeados CartaFisico_preco_<tipo>_<formato>_<combo>.
  if (ativo('cartas_fisico')) {
    for (const [tipoKey, slideNum] of Object.entries(SLIDE_CARTAS_POR_TIPO)) {
      const tipo = config.cartasFisico[tipoKey]
      const edicoesCartas = []
      for (const formato of ['A4', 'A3']) {
        for (const combo of ['1x1', '2x1', '4x1', '4x4']) {
          edicoesCartas.push({
            shape: `CartaFisico_preco_${tipoKey}_${formato}_${combo}`,
            type: 'run',
            run: 0,
            text: formatMoney(tipo[formato][combo]),
          })
        }
      }
      add(slideNum, edicoesCartas)
    }
  }

  // Slide 26 — card-resumo "PG+FILES" (Carnê / Fatura / Boleto). Fatura e Boleto não são
  // modelados ainda — os cards inteiros são removidos (nunca aparecem), não só o texto.
  if (ativo('carne')) {
    add(26, [{ shape: 'Google Shape;1047;p67', type: 'run', run: 0, text: val('preco_carne') }])
    add(26, GRUPO_FATURA_26.map((shape) => ({ shape, type: 'remove' })))
    add(26, GRUPO_BOLETO_26.map((shape) => ({ shape, type: 'remove' })))
  }

  // Slide 30 — card-resumo "PG+CONTACT" (Smart Contact / Valida+ / Enriquecimento / Contact
  // Score). Entra se qualquer um dos canais de Smart Contact, Valida+ ou Enriquecimento
  // estiver ativo — canal inativo remove o card inteiro (mesma regra do slide 25). "Contact
  // Score" não tem produto próprio modelado — o card sempre é removido.
  if (flags.precoSmartContactResumo !== null || validaAtivoSlide20 || enriquecimentoAtivoSlide20) {
    add(30, cardOuRemove(flags.precoSmartContactResumo !== null, GRUPO_SMART_CONTACT_RESUMO_30[0], val('preco_smart_contact_resumo'), GRUPO_SMART_CONTACT_RESUMO_30.slice(1)))
    add(30, cardOuRemove(validaAtivoSlide20, GRUPO_VALIDA_RESUMO_30[0], val('preco_valida_mais'), GRUPO_VALIDA_RESUMO_30.slice(1)))
    add(30, cardOuRemove(enriquecimentoAtivoSlide20, GRUPO_ENRIQUECIMENTO_RESUMO_30[0], val('preco_enriquecimento_ativo'), GRUPO_ENRIQUECIMENTO_RESUMO_30.slice(1)))
    add(30, GRUPO_CONTACT_SCORE_30.map((shape) => ({ shape, type: 'remove' })))
  }

  return edicoes
}
