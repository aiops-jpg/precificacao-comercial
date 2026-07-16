import { formatMoney, formatMoneyPreciso } from './precificacao'
import { PRICING_DEFAULTS } from './pricingDefaults'

// Slides institucionais/fixos do template — sempre entram na proposta. 31 é sempre o último.
export const SLIDES_FIXAS = [1, 7, 9, 31]

// Canal ativo (Discovery) -> slides condicionais do template que devem entrar na proposta.
export const CANAL_SLIDES = {
  one_platform: [10, 11, 12, 14],
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
  cartas_fisico: [19, 25],
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
  return [...new Set([...SLIDES_FIXAS, ...getSlidesCondicionais(canaisAtivos)])].sort((a, b) => a - b)
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

// Cada edição referencia um shape do template pelo nome exato ("Google Shape;NNN;pXX").
// type 'run' seta o texto de um run específico (por índice) sem afetar os demais.
// type 'replace' faz uma substituição de substring dentro do texto já existente do shape.
export function getEdicoesPorSlide(result, discovery, config = PRICING_DEFAULTS) {
  const ativo = (k) => discovery.canais_ativos.includes(k)
  const edicoes = {}
  const add = (slide, list) => { edicoes[slide] = [...(edicoes[slide] || []), ...list] }

  add(1, [
    { shape: 'Google Shape;232;p42', type: 'run', run: 0, text: `Proposta Nº ${discovery.numeroProposta || '000'} | ${discovery.nomeCliente || 'Cliente'}` },
    { shape: 'Google Shape;233;p42', type: 'run', run: 0, text: `${discovery.dataProposta || ''}   ` },
  ])

  // Título "Smart Journey Collection" quebra linha de forma feia no template original — alarga a caixa.
  add(9, [
    { shape: 'Google Shape;509;p50', type: 'resize', cx: 4200000 },
  ])

  if (ativo('one_platform')) {
    // Slide 13 (detalhamento SETUP/RECORRENTE) fica pronto mas não entra por padrão —
    // a lista atual de slides do ONE Collect é 10, 11, 12 e 14.
    add(13, [
      { shape: 'Google Shape;647;p54', type: 'run', run: 0, text: 'R$ ' },
      { shape: 'Google Shape;647;p54', type: 'run', run: 1, text: formatCompacto(setupONE(result.plano_one, config)) },
      { shape: 'Google Shape;645;p54', type: 'run', run: 0, text: `RECORRENTE: ${formatMoney(result.plano_one.total_mensal)}/mês` },
      { shape: 'Google Shape;651;p54', type: 'replace', from: 'R$ XXXXX', to: 'incluída no plano contratado' },
      { shape: 'Google Shape;640;p54', type: 'replace', from: 'R$XXXXX', to: 'R$200' },
    ])
    add(14, [
      { shape: 'Google Shape;663;p55', type: 'run', run: 0, text: formatMoney(result.plano_one.total_mensal) },
    ])
    // Segundo card do mesmo slide ("E+mail Massivo + Portal") — soma o que estiver ativo dos dois.
    if (ativo('email') || ativo('portal_negociacao')) {
      const precoEmailMassivoPortal = (ativo('email') ? result.orcamentos.email : 0)
        + (ativo('portal_negociacao') ? result.orcamentos.portal_negociacao : 0)
      add(14, [{ shape: 'Google Shape;659;p55', type: 'run', run: 0, text: formatMoney(precoEmailMassivoPortal) }])
    }
  }

  if (ativo('voicebot')) {
    add(16, [
      { shape: 'Google Shape;702;p57', type: 'run', run: 0, text: 'R$ ' },
      { shape: 'Google Shape;702;p57', type: 'run', run: 1, text: formatCompacto(config.setup.voicebot) },
      { shape: 'Google Shape;688;p57', type: 'run', run: 1, text: `POR ROBÔ: ${formatMoney(2000)} ` },
      { shape: 'Google Shape;717;p57', type: 'run', run: 1, text: '200' },
    ])
  }

  if (ativo('chatbot')) {
    add(17, [
      { shape: 'Google Shape;736;p58', type: 'run', run: 0, text: 'R$ ' },
      { shape: 'Google Shape;736;p58', type: 'run', run: 1, text: formatCompacto(config.setup.chatbot) },
      { shape: 'Google Shape;731;p58', type: 'replace', from: '5.000', to: '4.000' },
      { shape: 'Google Shape;752;p58', type: 'run', run: 1, text: '0,40' },
    ])
  }

  // Slide 20 — "pg channels" (detalhamento): SMS / Email Simples / Email c/ Documento / Boleto Digital /
  // Registro Cartório / Enriquecimento / Valida+ / Landing Page. O slide entra se QUALQUER um destes
  // canais estiver ativo (CANAL_SLIDES) — então cada preço aqui precisa de edição própria e
  // incondicional: valor real se o canal correspondente estiver ativo, "" (vazio) se não, pra nunca
  // sobrar o placeholder "R$ XXX" do template de um produto que não foi pedido nesta proposta.
  const smsAtivoSlide20 = ['sms_texto', 'sms_fast_otp', 'sms_rota_exclusiva', 'sms_sender_id', 'sms_flash'].some(ativo)
  const precoEnriquecimentoSlide20 = ativo('enriquecimento_premium') ? result.precos.enriquecimento_premium : ativo('enriquecimento') ? result.precos.enriquecimento : null
  add(20, [
    { shape: 'Google Shape;792;p61', type: 'run', run: 0, text: smsAtivoSlide20 ? formatMoneyPreciso(result.precos.sms) : '' },
    { shape: 'Google Shape;788;p61', type: 'run', run: 0, text: ativo('email') ? formatMoneyPreciso(result.precos.email) : '' },
    { shape: 'Google Shape;790;p61', type: 'run', run: 0, text: ativo('email_registrado') ? formatMoneyPreciso(result.precos.email_registrado) : '' },
    { shape: 'Google Shape;807;p61', type: 'run', run: 0, text: ativo('documento_digital') ? formatMoneyPreciso(result.precos.documento_digital) : '' },
    { shape: 'Google Shape;808;p61', type: 'run', run: 0, text: ativo('cartorio_documento') ? formatMoneyPreciso(result.precos.cartorio_documento) : '' },
    { shape: 'Google Shape;802;p61', type: 'run', run: 0, text: precoEnriquecimentoSlide20 !== null ? formatMoneyPreciso(precoEnriquecimentoSlide20) : '' },
    { shape: 'Google Shape;811;p61', type: 'run', run: 0, text: ativo('valida_mais') ? formatMoneyPreciso(result.precos.valida_mais) : '' },
    { shape: 'Google Shape;818;p61', type: 'run', run: 0, text: ativo('landing_page_link') ? formatMoneyPreciso(result.precos.landing_page_link) : '' },
  ])

  if (ativo('whats_ativo') || ativo('whats_receptivo')) {
    add(21, [
      { shape: 'Google Shape;833;p62', type: 'run', run: 1, text: formatCompacto(config.setup.whatsapp) },
      { shape: 'Google Shape;843;p62', type: 'run', run: 1, text: '0,18' },
      { shape: 'Google Shape;844;p62', type: 'run', run: 1, text: '0,18' },
    ])
  }

  // Slide 23 — detalhamento RCS: 923 = Básico, 930 = Simples. Sem placeholder de Conversacional/
  // Sessão no template — só entra na proposta via slide 25 (card-resumo), não aqui.
  if (ativo('rcs') || ativo('rcs_basico') || ativo('rcs_simples')) {
    add(23, [
      { shape: 'Google Shape;923;p64', type: 'run', run: 1, text: ativo('rcs_basico') ? formatNumeroPreciso(result.precos.rcs_basico) : '' },
      { shape: 'Google Shape;930;p64', type: 'run', run: 1, text: ativo('rcs_simples') ? formatNumeroPreciso(result.precos.rcs_simples) : '' },
    ])
  }

  if (ativo('portal_negociacao')) {
    add(28, [
      { shape: 'Google Shape;1081;p69', type: 'run', run: 0, text: '' },
      { shape: 'Google Shape;1081;p69', type: 'run', run: 1, text: formatMoney(config.setup.portal_negociacao) },
      { shape: 'Google Shape;1084;p69', type: 'run', run: 1, text: '15.000' },
    ])
  }

  if (ativo('landing_page_link')) {
    add(29, [
      { shape: 'Google Shape;1094;p70', type: 'run', run: 0, text: '' },
      { shape: 'Google Shape;1094;p70', type: 'run', run: 1, text: formatMoney(config.setup.landing_page_link) },
      { shape: 'Google Shape;1092;p70', type: 'run', run: 0, text: 'VALOR POR LINK' },
      { shape: 'Google Shape;1097;p70', type: 'run', run: 1, text: '0,02' },
      { shape: 'Google Shape;1098;p70', type: 'run', run: 0, text: 'Sem franquia mínima' },
    ])
  }

  // Slide 25 — card-resumo "PG+CHANNELS" (E-mail / RCS / SMS / Carta / ADS / Whats)
  const precoEmailResumo = ativo('email') ? result.precos.email
    : ativo('email_registrado') ? result.precos.email_registrado
    : ativo('email_pdf') ? result.precos.email_pdf
    : ativo('email_smtp') ? result.precos.email_smtp
    : null
  if (precoEmailResumo !== null) add(25, [{ shape: 'Google Shape;1012;p66', type: 'run', run: 0, text: formatMoneyPreciso(precoEmailResumo) }])

  const precoRcsResumo = ativo('rcs') ? result.precos.rcs
    : ativo('rcs_basico') ? result.precos.rcs_basico
    : ativo('rcs_simples') ? result.precos.rcs_simples
    : null
  if (precoRcsResumo !== null) add(25, [{ shape: 'Google Shape;1016;p66', type: 'run', run: 0, text: formatMoneyPreciso(precoRcsResumo) }])

  const smsAtivo = ['sms_texto', 'sms_fast_otp', 'sms_rota_exclusiva', 'sms_sender_id', 'sms_flash'].some(ativo)
  if (smsAtivo) add(25, [{ shape: 'Google Shape;1021;p66', type: 'run', run: 0, text: formatMoneyPreciso(result.precos.sms) }])

  if (ativo('cartas_fisico')) add(25, [{ shape: 'Google Shape;1027;p66', type: 'run', run: 0, text: formatMoneyPreciso(result.precos.cartas_fisico) }])

  if (ativo('google_meta_ads')) add(25, [{ shape: 'Google Shape;1031;p66', type: 'run', run: 0, text: formatMoneyPreciso(result.precos.google_meta_ads) }])

  const precoWhatsResumo = ativo('whats_ativo') ? result.precos.whats_ativo : ativo('whats_receptivo') ? result.precos.whats_receptivo : null
  if (precoWhatsResumo !== null) add(25, [{ shape: 'Google Shape;1035;p66', type: 'run', run: 0, text: formatMoneyPreciso(precoWhatsResumo) }])

  // Slide 26 — card-resumo "PG+FILES" (Carnê / Boleto — Boleto não é modelado ainda)
  if (ativo('carne')) add(26, [{ shape: 'Google Shape;1047;p67', type: 'run', run: 0, text: formatMoneyPreciso(result.precos.carne) }])

  // Slide 30 — card-resumo "PG+CONTACT" (Valida+ / Enriquecimento — Smart Contact Score fica de fora, é sob demanda)
  if (ativo('valida_mais')) add(30, [{ shape: 'Google Shape;1110;p71', type: 'run', run: 0, text: formatMoneyPreciso(result.precos.valida_mais) }])

  const precoEnriquecimentoResumo = ativo('enriquecimento_premium') ? result.precos.enriquecimento_premium : ativo('enriquecimento') ? result.precos.enriquecimento : null
  if (precoEnriquecimentoResumo !== null) add(30, [{ shape: 'Google Shape;1114;p71', type: 'run', run: 0, text: formatMoneyPreciso(precoEnriquecimentoResumo) }])

  return edicoes
}
