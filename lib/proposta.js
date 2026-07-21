import { formatMoney, formatMoneyPreciso } from './precificacao'
import { PRICING_DEFAULTS } from './pricingDefaults'

// Slides institucionais/fixos do template — sempre entram na proposta.
export const SLIDES_FIXAS = [1, 7, 9, 31]

// 31 é o slide de encerramento — precisa continuar por último mesmo quando um slide condicional
// tem número maior (ex: 33, tabela de referência de Cartas/Físico, adicionada depois do template
// original). Ordenar só por número quebraria essa regra.
const SLIDE_ENCERRAMENTO = 31

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
  // 33 = tabela de referência (3 tipos x 2 formatos x 4 combinações, sem MDP-Básica)
  cartas_fisico: [19, 25, 33],
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

// Cada edição referencia um shape do template pelo nome exato ("Google Shape;NNN;pXX").
// type 'run' seta o texto de um run específico (por índice) sem afetar os demais.
// type 'replace' faz uma substituição de substring dentro do texto já existente do shape.
export function getEdicoesPorSlide(result, discovery, config = PRICING_DEFAULTS) {
  const ativo = (k) => discovery.canais_ativos.includes(k)
  const edicoes = {}
  const add = (slide, list) => { edicoes[slide] = [...(edicoes[slide] || []), ...list] }

  // Card de um "PG+..." card-resumo (fundo + preço + ícone + label) — se o produto não estiver
  // ativo, remove o card inteiro em vez de só limpar o texto do preço, senão sobra uma caixa
  // vazia no meio do slide pra algo que nem foi cotado.
  const cardOuRemove = (isActive, precoShape, precoTexto, outrosShapes) => {
    if (isActive) return [{ shape: precoShape, type: 'run', run: 0, text: precoTexto }]
    return [precoShape, ...outrosShapes].map((shape) => ({ shape, type: 'remove' }))
  }

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
    // Segundo card do mesmo slide ("E+mail Massivo + Portal") — soma o que estiver ativo dos
    // dois. Se nenhum dos dois foi selecionado, o card inteiro (fundo + ícone + label + preço)
    // é removido do slide — não basta limpar o texto, senão sobra uma caixa vazia.
    const precoEmailMassivoPortal = (ativo('email') ? result.orcamentos.email : 0)
      + (ativo('portal_negociacao') ? result.orcamentos.portal_negociacao : 0)
    if (precoEmailMassivoPortal > 0) {
      add(14, [{ shape: 'Google Shape;659;p55', type: 'run', run: 0, text: formatMoney(precoEmailMassivoPortal) }])
    } else {
      add(14, ['Google Shape;658;p55', 'Google Shape;659;p55', 'Google Shape;660;p55', 'Google Shape;661;p55', 'Google Shape;667;p55']
        .map((shape) => ({ shape, type: 'remove' })))
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
  // Registro Cartório / Enriquecimento / Valida+ / Landing Page, todos no MESMO slide. Entra se
  // QUALQUER um destes canais estiver ativo (CANAL_SLIDES) — ex: só Landing Page já traz o slide
  // inteiro. Cada seção (caixa + descrição + preço) é removida por completo se o(s) produto(s)
  // dela não estiverem ativos — não só o texto do preço, senão sobra a descrição e o ícone de um
  // produto que nem foi cotado.
  const smsAtivoSlide20 = ['sms_texto', 'sms_fast_otp', 'sms_rota_exclusiva', 'sms_sender_id', 'sms_flash'].some(ativo)
  const precoEnriquecimentoSlide20 = ativo('enriquecimento_premium') ? result.precos.enriquecimento_premium : ativo('enriquecimento') ? result.precos.enriquecimento : null

  // SMS — seção própria (781/782/783/784/785/791/793/795 + preço 792)
  add(20, cardOuRemove(smsAtivoSlide20, 'Google Shape;792;p61', formatMoneyPreciso(result.precos.sms),
    ['Google Shape;781;p61', 'Google Shape;782;p61', 'Google Shape;783;p61', 'Google Shape;784;p61', 'Google Shape;785;p61', 'Google Shape;791;p61', 'Google Shape;793;p61', 'Google Shape;795;p61']))

  // Email Simples e Email c/ Documento (Registrado) compartilham uma caixa (780/786/794/796) —
  // cada um remove só o próprio label+preço; a caixa/descrição/ícone comuns só saem se os dois
  // estiverem inativos.
  const emailSimplesAtivo = ativo('email')
  const emailRegistradoAtivo = ativo('email_registrado')
  add(20, cardOuRemove(emailSimplesAtivo, 'Google Shape;788;p61', formatMoneyPreciso(result.precos.email), ['Google Shape;787;p61']))
  add(20, cardOuRemove(emailRegistradoAtivo, 'Google Shape;790;p61', formatMoneyPreciso(result.precos.email_registrado), ['Google Shape;789;p61']))
  if (!emailSimplesAtivo && !emailRegistradoAtivo) {
    add(20, ['Google Shape;780;p61', 'Google Shape;786;p61', 'Google Shape;794;p61', 'Google Shape;796;p61'].map((shape) => ({ shape, type: 'remove' })))
  }

  // Boleto Digital (documento_digital) e Registro Cartório compartilham uma caixa (798/803/806/809).
  const documentoDigitalAtivo = ativo('documento_digital')
  const cartorioAtivo = ativo('cartorio_documento')
  add(20, cardOuRemove(documentoDigitalAtivo, 'Google Shape;807;p61', formatMoneyPreciso(result.precos.documento_digital), ['Google Shape;804;p61']))
  add(20, cardOuRemove(cartorioAtivo, 'Google Shape;808;p61', formatMoneyPreciso(result.precos.cartorio_documento), ['Google Shape;805;p61']))
  if (!documentoDigitalAtivo && !cartorioAtivo) {
    add(20, ['Google Shape;798;p61', 'Google Shape;803;p61', 'Google Shape;806;p61', 'Google Shape;809;p61'].map((shape) => ({ shape, type: 'remove' })))
  }

  // Enriquecimento e Valida+ compartilham uma caixa (797/799/800). O ícone 820 é uma ÚNICA
  // imagem com os dois nomes escritos juntos ("+ENRIQUECIMENTO"/"+VALIDA") — não dá pra mostrar
  // só um nome de dentro da imagem, então ele só aparece quando os DOIS estiverem ativos; com só
  // um dos dois, some o ícone mas "Dados de Contato" + o preço certo continuam.
  const enriquecimentoAtivoSlide20 = precoEnriquecimentoSlide20 !== null
  const validaAtivoSlide20 = ativo('valida_mais')
  add(20, cardOuRemove(enriquecimentoAtivoSlide20, 'Google Shape;802;p61', formatMoneyPreciso(precoEnriquecimentoSlide20 || 0), ['Google Shape;801;p61']))
  add(20, cardOuRemove(validaAtivoSlide20, 'Google Shape;811;p61', formatMoneyPreciso(result.precos.valida_mais), ['Google Shape;810;p61']))
  if (!enriquecimentoAtivoSlide20 && !validaAtivoSlide20) {
    add(20, ['Google Shape;797;p61', 'Google Shape;799;p61', 'Google Shape;800;p61', 'Google Shape;820;p61'].map((shape) => ({ shape, type: 'remove' })))
  } else if (!(enriquecimentoAtivoSlide20 && validaAtivoSlide20)) {
    add(20, [{ shape: 'Google Shape;820;p61', type: 'remove' }])
  }

  // Landing Page — seção própria (812/813/814/815/816/817/819 + preço 818).
  add(20, cardOuRemove(ativo('landing_page_link'), 'Google Shape;818;p61', formatMoneyPreciso(result.precos.landing_page_link),
    ['Google Shape;812;p61', 'Google Shape;813;p61', 'Google Shape;814;p61', 'Google Shape;815;p61', 'Google Shape;816;p61', 'Google Shape;817;p61', 'Google Shape;819;p61']))

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

  // Slide 25 — card-resumo "PG+CHANNELS" (E-mail / RCS / SMS / Carta / ADS / Whats). Esse slide
  // entra na proposta se QUALQUER UM dos 6 canais estiver ativo (ver CANAL_SLIDES) — os canais
  // que não foram selecionados têm o card inteiro (fundo + ícone + label + preço) removido, não
  // só o texto — senão sobra uma caixa vazia no meio do slide.
  const precoEmailResumo = ativo('email') ? result.precos.email
    : ativo('email_registrado') ? result.precos.email_registrado
    : ativo('email_pdf') ? result.precos.email_pdf
    : ativo('email_smtp') ? result.precos.email_smtp
    : null
  add(25, cardOuRemove(precoEmailResumo !== null, 'Google Shape;1012;p66', formatMoneyPreciso(precoEmailResumo || 0),
    ['Google Shape;1011;p66', 'Google Shape;1013;p66', 'Google Shape;1014;p66', 'Google Shape;1019;p66']))

  const precoRcsResumo = ativo('rcs') ? result.precos.rcs
    : ativo('rcs_basico') ? result.precos.rcs_basico
    : ativo('rcs_simples') ? result.precos.rcs_simples
    : null
  add(25, cardOuRemove(precoRcsResumo !== null, 'Google Shape;1016;p66', formatMoneyPreciso(precoRcsResumo || 0),
    ['Google Shape;1015;p66', 'Google Shape;1017;p66', 'Google Shape;1018;p66', 'Google Shape;1025;p66']))

  const smsAtivo = ['sms_texto', 'sms_fast_otp', 'sms_rota_exclusiva', 'sms_sender_id', 'sms_flash'].some(ativo)
  add(25, cardOuRemove(smsAtivo, 'Google Shape;1021;p66', formatMoneyPreciso(result.precos.sms),
    ['Google Shape;1020;p66', 'Google Shape;1022;p66', 'Google Shape;1023;p66', 'Google Shape;1024;p66']))

  // Card-resumo mostra "a partir de" (o mais barato dos tipos listados na tabela de referência
  // do slide 33) — o preço real varia até 24x por tipo/formato/impressão, então não dá pra
  // reduzir a um único valor "correto"; ver tabela completa no slide 33.
  add(25, cardOuRemove(ativo('cartas_fisico'), 'Google Shape;1027;p66', formatMoney(config.cartasFisico.fac_simples.A4['1x1']),
    ['Google Shape;1026;p66', 'Google Shape;1028;p66', 'Google Shape;1029;p66', 'Google Shape;1039;p66']))

  add(25, cardOuRemove(ativo('google_meta_ads'), 'Google Shape;1031;p66', formatMoneyPreciso(result.precos.google_meta_ads),
    ['Google Shape;1030;p66', 'Google Shape;1032;p66', 'Google Shape;1033;p66', 'Google Shape;1040;p66']))

  const precoWhatsResumo = ativo('whats_ativo') ? result.precos.whats_ativo : ativo('whats_receptivo') ? result.precos.whats_receptivo : null
  add(25, cardOuRemove(precoWhatsResumo !== null, 'Google Shape;1035;p66', formatMoneyPreciso(precoWhatsResumo || 0),
    ['Google Shape;1034;p66', 'Google Shape;1036;p66', 'Google Shape;1037;p66', 'Google Shape;1038;p66']))

  // Slide 33 — tabela de referência de Cartas/Físico (3 tipos x 2 formatos x 4 combinações de
  // impressão, MDP-Básica fora por decisão). Nomes de shape batem com os criados via python-pptx
  // em templates/proposta-template.pptx — ver scratchpad add_cartas_slide.py de referência.
  if (ativo('cartas_fisico')) {
    const edicoesCartas = []
    for (const [tipoKey, tipo] of Object.entries(config.cartasFisico)) {
      if (tipoKey === 'mdp_basica') continue
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
    }
    add(33, edicoesCartas)
  }

  // Slide 26 — card-resumo "PG+FILES" (Carnê / Fatura / Boleto). Fatura e Boleto não são
  // modelados ainda — os cards inteiros são removidos (nunca aparecem), não só o texto.
  if (ativo('carne')) {
    add(26, [{ shape: 'Google Shape;1047;p67', type: 'run', run: 0, text: formatMoneyPreciso(result.precos.carne) }])
    add(26, ['Google Shape;1050;p67', 'Google Shape;1051;p67', 'Google Shape;1052;p67', 'Google Shape;1053;p67', 'Google Shape;1060;p67']
      .map((shape) => ({ shape, type: 'remove' })))
    add(26, ['Google Shape;1054;p67', 'Google Shape;1055;p67', 'Google Shape;1056;p67', 'Google Shape;1057;p67', 'Google Shape;1058;p67']
      .map((shape) => ({ shape, type: 'remove' })))
  }

  // Slide 30 — card-resumo "PG+CONTACT" (Smart Contact / Valida+ / Enriquecimento / Contact
  // Score). Entra se qualquer um dos canais de Smart Contact, Valida+ ou Enriquecimento
  // estiver ativo — canal inativo remove o card inteiro (mesma regra do slide 25). "Contact
  // Score" não tem produto próprio modelado — o card sempre é removido.
  const precoSmartContactResumo = ativo('smart_contact_phone_score') ? result.precos.smart_contact_phone_score
    : ativo('smart_contact_phone_enriquecimento') ? result.precos.smart_contact_phone_enriquecimento
    : ativo('smart_contact_email_score') ? result.precos.smart_contact_email_score
    : ativo('smart_contact_email_enriquecimento') ? result.precos.smart_contact_email_enriquecimento
    : null
  const precoEnriquecimentoResumo = ativo('enriquecimento_premium') ? result.precos.enriquecimento_premium : ativo('enriquecimento') ? result.precos.enriquecimento : null
  if (precoSmartContactResumo !== null || ativo('valida_mais') || precoEnriquecimentoResumo !== null) {
    add(30, cardOuRemove(precoSmartContactResumo !== null, 'Google Shape;1106;p71', formatMoneyPreciso(precoSmartContactResumo || 0),
      ['Google Shape;1105;p71', 'Google Shape;1107;p71', 'Google Shape;1108;p71', 'Google Shape;1122;p71']))
    add(30, cardOuRemove(ativo('valida_mais'), 'Google Shape;1110;p71', formatMoneyPreciso(result.precos.valida_mais),
      ['Google Shape;1109;p71', 'Google Shape;1111;p71', 'Google Shape;1112;p71', 'Google Shape;1123;p71']))
    add(30, cardOuRemove(precoEnriquecimentoResumo !== null, 'Google Shape;1114;p71', formatMoneyPreciso(precoEnriquecimentoResumo || 0),
      ['Google Shape;1113;p71', 'Google Shape;1115;p71', 'Google Shape;1116;p71', 'Google Shape;1121;p71']))
    add(30, ['Google Shape;1117;p71', 'Google Shape;1118;p71', 'Google Shape;1119;p71', 'Google Shape;1120;p71', 'Google Shape;1124;p71']
      .map((shape) => ({ shape, type: 'remove' })))
  }

  return edicoes
}
