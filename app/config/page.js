'use client'

import { useEffect, useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useConfig } from '@/lib/ConfigContext'
import { CANAIS_BLOCOS } from '@/lib/canais'
import { DISCOVERY_BLOCOS } from '@/lib/discoveryBlocos'

const SUBSTEP_LABEL = { 1: 'Perfil', 2: 'Canais', 3: 'Infraestrutura' }

function EyeIcon({ open }) {
  return open ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  )
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function setDeep(obj, path, value) {
  const next = clone(obj)
  let cur = next
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]]
  cur[path[path.length - 1]] = value
  return next
}

function getDeep(obj, path) {
  return path.reduce((cur, key) => (cur == null ? cur : cur[key]), obj)
}

function NumberField({ label, value, onChange, step = 'any', suffix }) {
  return (
    <div className="field-group">
      <label>{label}</label>
      {suffix ? (
        <div className="input-suffix">
          <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
          />
          <span className="suffix suffix-unit">{suffix}</span>
        </div>
      ) : (
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
        />
      )}
    </div>
  )
}

// Faixas devem ser contíguas e ordenadas (min ascendente, cada tier.min = tier_anterior.max + 1) —
// é a regra que getPrecoPorFaixa espera. Sobreposição ou lacuna quebra o preço em silêncio.
// mode 'lookup' (SMS/Email/Enriquecimento/...): getPrecoPorFaixa casa o PRIMEIRO min<=valor<=max,
// então faixas vizinhas devem ter próxima.min = atual.max + 1 (sem gap, sem sobreposição).
// mode 'marginal' (ONE Enterprise): calcONEEnterprise consome cada faixa como um bracket de
// largura (max-min) em sequência — o "min" só serve de referência visual, então o correto
// é próxima.min = atual.max (fronteira compartilhada, sem o +1).
function validarFaixas(tiers, mode = 'lookup') {
  const offset = mode === 'marginal' ? 0 : 1
  const ordenadas = tiers.map((t, i) => ({ ...t, i })).sort((a, b) => a.min - b.min)
  const avisos = []
  for (let k = 0; k < ordenadas.length - 1; k++) {
    const atual = ordenadas[k]
    const proxima = ordenadas[k + 1]
    if (atual.max === null) {
      avisos.push(`Faixa ${atual.i + 1} não tem teto mas não é a última — as faixas depois dela nunca serão usadas.`)
      continue
    }
    if (proxima.min < atual.max + offset) {
      avisos.push(`Faixas ${atual.i + 1} e ${proxima.i + 1} se sobrepõem (${atual.min}–${atual.max} e ${proxima.min}–${proxima.max ?? '∞'}).`)
    } else if (proxima.min > atual.max + offset) {
      avisos.push(`Lacuna entre as faixas ${atual.i + 1} e ${proxima.i + 1}: nenhum preço cobre de ${atual.max + offset} a ${proxima.min - 1}.`)
    }
  }
  return avisos
}

// Editor genérico de faixas [{min, max, preco}] — max vazio = sem teto (Infinity).
// excedenteLabel: quando informado, mostra uma coluna extra "preco por unidade excedente"
// (usado no pacote mensal do E-mail Transacional, cobrado além do teto da última faixa).
function TierEditor({ label, precoLabel, tiers, onChange, mode = 'lookup', excedenteLabel }) {
  const update = (i, field, val) => {
    const next = tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t))
    onChange(next)
  }
  const remove = (i) => onChange(tiers.filter((_, idx) => idx !== i))
  const add = () => onChange([...tiers, excedenteLabel ? { min: 0, max: null, preco: 0, excedente: 0 } : { min: 0, max: null, preco: 0 }])
  const avisos = validarFaixas(tiers, mode)

  return (
    <div className="card card-full">
      <div className="card-title">{label}</div>
      {avisos.map((msg, i) => (
        <div key={i} className="warning-banner">⚠ {msg}</div>
      ))}
      {tiers.map((t, i) => (
        <div key={i} className={excedenteLabel ? 'tier-row tier-row-5col' : 'tier-row'}>
          <div className="field-group">
            <label>De</label>
            <input type="number" value={t.min} onChange={(e) => update(i, 'min', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="field-group">
            <label>Até (vazio = sem teto)</label>
            <input
              type="number"
              value={t.max === null ? '' : t.max}
              placeholder="sem teto"
              onChange={(e) => update(i, 'max', e.target.value === '' ? null : parseFloat(e.target.value))}
            />
          </div>
          <div className="field-group">
            <label>{precoLabel}</label>
            <input type="number" step="any" value={t.preco} onChange={(e) => update(i, 'preco', parseFloat(e.target.value) || 0)} />
          </div>
          {excedenteLabel && (
            <div className="field-group">
              <label>{excedenteLabel}</label>
              <input type="number" step="any" value={t.excedente || 0} onChange={(e) => update(i, 'excedente', parseFloat(e.target.value) || 0)} />
            </div>
          )}
          <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => remove(i)} aria-label="Remover" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm btn-plus" onClick={add} aria-label="Adicionar Faixa" title="Adicionar Faixa">+</button>
    </div>
  )
}

export default function ConfigPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { config, updateConfig, resetToDefault, undoLast, canUndo, isCustom, hydrated, publicarBaseGeral } = useConfig()
  const [draft, setDraft] = useState(config)
  const [publicando, setPublicando] = useState(false)
  const [erroPublicar, setErroPublicar] = useState('')
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    setDraft(config)
  }, [config])

  const set = (path, value) => {
    setDraft((d) => setDeep(d, path, value))
  }

  const handleSalvar = () => {
    updateConfig(draft)
    fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'preco_sessao', detalhes: draft }),
    }).catch(() => { /* log é best-effort — não trava o salvar */ })
    router.push('/')
  }

  const handleCancelar = () => {
    router.push('/')
  }

  const handleRestaurar = () => {
    if (confirm('Restaurar todos os preços para o padrão de fábrica? Isso descarta todas as edições desta sessão (dá pra desfazer depois em "Desfazer Última Alteração").')) {
      resetToDefault()
    }
  }

  const confirmarEPublicar = async () => {
    if (!confirm('Publicar esta base de preços pra TODO MUNDO que usar o site? Isso substitui a base geral atual.')) return
    setErroPublicar('')
    setPublicando(true)
    try {
      await publicarBaseGeral(draft)
    } catch (e) {
      setErroPublicar(`Não foi possível publicar: ${e.message || e}`)
    } finally {
      setPublicando(false)
    }
  }

  const handlePublicarBaseGeral = () => {
    if (!session?.user) {
      setErroLogin('')
      setMostrarLogin(true)
      return
    }
    confirmarEPublicar()
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErroLogin('')
    setEntrando(true)
    const res = await signIn('credentials', { email: loginEmail, password: loginSenha, redirect: false })
    setEntrando(false)
    if (res?.error) {
      setErroLogin('E-mail ou senha incorretos.')
      return
    }
    setMostrarLogin(false)
    setLoginSenha('')
    confirmarEPublicar()
  }

  const desabilitados = new Set(draft.canaisDesabilitados || [])
  const toggleCanal = (key) => {
    const next = desabilitados.has(key)
      ? draft.canaisDesabilitados.filter((k) => k !== key)
      : [...draft.canaisDesabilitados, key]
    set(['canaisDesabilitados'], next)
  }
  const toggleGrupoCanais = (itens) => {
    const keys = itens.map((i) => i.key)
    const todosVisiveis = keys.every((k) => !desabilitados.has(k))
    const next = todosVisiveis
      ? [...new Set([...draft.canaisDesabilitados, ...keys])]
      : draft.canaisDesabilitados.filter((k) => !keys.includes(k))
    set(['canaisDesabilitados'], next)
  }

  const blocosDesabilitados = new Set(draft.blocosDesabilitados || [])
  const toggleBloco = (key) => {
    const next = blocosDesabilitados.has(key)
      ? draft.blocosDesabilitados.filter((k) => k !== key)
      : [...draft.blocosDesabilitados, key]
    set(['blocosDesabilitados'], next)
  }
  const todosBlocosVisiveis = DISCOVERY_BLOCOS.every(({ key }) => !blocosDesabilitados.has(key))
  const toggleTodosBlocos = () => {
    set(['blocosDesabilitados'], todosBlocosVisiveis ? DISCOVERY_BLOCOS.map((b) => b.key) : [])
  }

  if (!hydrated) return null

  return (
    <div className="container">
      <div className="header">
        <div className="header-main">
          <div className="header-icon">⚙</div>
          <div>
            <h1>Configuração de Preços</h1>
            <span className="sub">Edição válida apenas para esta sessão — feche a aba para voltar ao padrão.</span>
          </div>
        </div>
      </div>

      <div className="card card-full actions" style={{ alignItems: 'center' }}>
        <button type="button" className="btn" onClick={handleSalvar}>Salvar Alterações</button>
        <button type="button" className="btn btn-secondary btn-hover-gray" onClick={handleCancelar}>Cancelar</button>
        <button type="button" className="btn btn-secondary btn-hover-gray" onClick={undoLast} disabled={!canUndo}>↩ Desfazer Última Alteração</button>
        <button type="button" className="btn btn-danger" onClick={handleRestaurar}>Restaurar Padrão</button>
        <button type="button" className="btn btn-secondary btn-hover-gray" onClick={handlePublicarBaseGeral} disabled={publicando} style={{ borderColor: '#0120eb', color: '#0120eb' }}>
          {session?.user ? (publicando ? 'Publicando...' : '🌐 Mudar Base de Preços Geral') : '🔒 Mudar Base de Preços Geral'}
        </button>
        {isCustom && <span style={{ color: '#c0392b', fontWeight: 700 }}>● Preços diferentes do padrão de fábrica</span>}
        {session?.user && (
          <span style={{ fontSize: 12, color: '#555' }}>
            Logado como {session.user.email} · <button type="button" className="btn-link" onClick={() => signOut({ callbackUrl: '/config' })}>Sair</button>
          </span>
        )}
        {erroPublicar && <span style={{ color: '#c0392b', fontSize: 13 }}>{erroPublicar}</span>}
      </div>

      {mostrarLogin && (
        <div className="card card-full" style={{ maxWidth: 360 }}>
          <div className="card-title">Login — Mudar Base de Preços Geral</div>
          <form onSubmit={handleLoginSubmit}>
            <div className="field-row cols-2">
              <div className="field-group">
                <label>E-mail</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="voce@pgmais.com.br" required autoFocus />
              </div>
              <div className="field-group">
                <label>Senha</label>
                <input type="password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} required />
              </div>
            </div>
            {erroLogin && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{erroLogin}</p>}
            <div className="actions">
              <button type="submit" className="btn" disabled={entrando}>{entrando ? 'Entrando...' : 'Entrar e Publicar'}</button>
              <button type="button" className="btn btn-secondary btn-hover-gray" onClick={() => setMostrarLogin(false)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid">
        {/* ONE PLATFORM */}
        <div className="card card-full">
          <div className="card-title">ONE Platform — Planos Basic / Plus</div>
          <div className="field-row cols-2">
            <div>
              <div className="canal-grupo-label">Basic</div>
              <div className="field-row cols-3">
                <NumberField label="Mensalidade" value={draft.one.basic.mensal} onChange={(v) => set(['one', 'basic', 'mensal'], v)} />
                <NumberField label="Limite de CPFs" value={draft.one.basic.limite_cpf} onChange={(v) => set(['one', 'basic', 'limite_cpf'], v)} />
                <NumberField label="Setup" value={draft.one.basic.setup} onChange={(v) => set(['one', 'basic', 'setup'], v)} />
                <NumberField label="Excedente por CPF" value={draft.one.basic.excedente} onChange={(v) => set(['one', 'basic', 'excedente'], v)} suffix="R$/CPF" />
              </div>
            </div>
            <div>
              <div className="canal-grupo-label">Plus</div>
              <div className="field-row cols-3">
                <NumberField label="Mensalidade" value={draft.one.plus.mensal} onChange={(v) => set(['one', 'plus', 'mensal'], v)} />
                <NumberField label="Limite de CPFs" value={draft.one.plus.limite_cpf} onChange={(v) => set(['one', 'plus', 'limite_cpf'], v)} />
                <NumberField label="Setup" value={draft.one.plus.setup} onChange={(v) => set(['one', 'plus', 'setup'], v)} />
                <NumberField label="Excedente por CPF" value={draft.one.plus.excedente} onChange={(v) => set(['one', 'plus', 'excedente'], v)} suffix="R$/CPF" />
              </div>
            </div>
          </div>
          <div className="field-group" style={{ marginTop: 12 }}>
            <NumberField label="ONE Enterprise — Setup por portfólio" value={draft.one.enterprise_setup} onChange={(v) => set(['one', 'enterprise_setup'], v)} />
          </div>
        </div>

        <TierEditor
          label="ONE Enterprise — Faixas Marginais de Excedente (R$/CPF)"
          precoLabel="R$/CPF"
          tiers={draft.one.enterprise_faixas}
          onChange={(v) => set(['one', 'enterprise_faixas'], v)}
          mode="marginal"
        />

        {/* OMNI */}
        <div className="card card-full">
          <div className="card-title">Plataforma OMNI — Planos</div>
          {draft.omni.planos.map((p, i) => (
            <div key={p.nome} style={{ marginBottom: 10 }}>
              <div className="canal-grupo-label">{p.nome}</div>
              <div className="field-row cols-3">
                <div className="field-group">
                  <label>Mensalidade</label>
                  <input
                    type="number"
                    value={p.mensal === null ? '' : p.mensal}
                    placeholder="Sob consulta"
                    onChange={(e) => set(['omni', 'planos', i, 'mensal'], e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
                <div className="field-group">
                  <label>Conversas incluídas</label>
                  <input
                    type="number"
                    value={p.conversas === null ? '' : p.conversas}
                    placeholder="Sob consulta"
                    onChange={(e) => set(['omni', 'planos', i, 'conversas'], e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
                <NumberField label="Excedente por conversa" value={p.excedente} onChange={(v) => set(['omni', 'planos', i, 'excedente'], v)} suffix="R$/conversa" />
              </div>
              {p.mensal === null && <span className="hint">Campos em branco = plano "sob consulta" (sem mensalidade fixa)</span>}
            </div>
          ))}
        </div>

        {/* TELECOBRANÇA */}
        <div className="card card-full">
          <div className="card-title">Telecobrança (CICLO) — Dimensionamento por PA</div>
          <div className="field-row cols-3">
            <NumberField label="CPFs por PA" value={draft.telecobranca.cpfs_por_pa} onChange={(v) => set(['telecobranca', 'cpfs_por_pa'], v)} />
            <NumberField label="PA mínimo" value={draft.telecobranca.pa_minimo} onChange={(v) => set(['telecobranca', 'pa_minimo'], v)} />
            <NumberField label="Voice AI — R$/PA" value={draft.telecobranca.voice_ai_por_pa} onChange={(v) => set(['telecobranca', 'voice_ai_por_pa'], v)} />
            <NumberField label="Cross Channel — R$/PA" value={draft.telecobranca.cross_channel_por_pa} onChange={(v) => set(['telecobranca', 'cross_channel_por_pa'], v)} />
          </div>
        </div>

        {/* FAIXAS TARIFÁRIAS */}
        <TierEditor label="Faixas — SMS Texto/Simples (R$/unidade)" precoLabel="R$/un" tiers={draft.faixas.sms} onChange={(v) => set(['faixas', 'sms'], v)} />
        <TierEditor label="Faixas — E-mail Simples (R$/unidade)" precoLabel="R$/un" tiers={draft.faixas.email} onChange={(v) => set(['faixas', 'email'], v)} />
        <TierEditor label="Faixas — Enriquecimento (R$/unidade)" precoLabel="R$/un" tiers={draft.faixas.enriquecimento} onChange={(v) => set(['faixas', 'enriquecimento'], v)} />
        <TierEditor label="Faixas — E-mail Registrado / AR Digital (R$/unidade)" precoLabel="R$/un" tiers={draft.faixas.email_registrado} onChange={(v) => set(['faixas', 'email_registrado'], v)} />
        <TierEditor label="Faixas — E-mail SMTP (pacote mensal fechado, R$)" precoLabel="R$/pacote" tiers={draft.faixas.email_smtp} onChange={(v) => set(['faixas', 'email_smtp'], v)} />
        <TierEditor
          label="Faixas — E-mail Transacional (pacote mensal fechado, R$)"
          precoLabel="R$/pacote"
          excedenteLabel="R$/un excedente"
          tiers={draft.faixas.email_transacional}
          onChange={(v) => set(['faixas', 'email_transacional'], v)}
        />
        <div className="card card-full">
          <div style={{ maxWidth: 260 }}>
            <NumberField
              label="E-mail Transacional — Franquia mínima mensal (R$)"
              value={draft.precos.email_transacional_franquia_minima}
              onChange={(v) => set(['precos', 'email_transacional_franquia_minima'], v)}
            />
          </div>
        </div>

        {/* SETUPS */}
        <div className="card card-full">
          <div className="card-title">Custos de Setup (implantação — únicos)</div>
          <div className="field-row cols-3">
            <NumberField label="Chatbot" value={draft.setup.chatbot} onChange={(v) => set(['setup', 'chatbot'], v)} />
            <NumberField label="Voicebot" value={draft.setup.voicebot} onChange={(v) => set(['setup', 'voicebot'], v)} />
            <NumberField label="Portal de Negociação" value={draft.setup.portal_negociacao} onChange={(v) => set(['setup', 'portal_negociacao'], v)} />
            <NumberField label="Landing Page" value={draft.setup.landing_page_link} onChange={(v) => set(['setup', 'landing_page_link'], v)} />
            <NumberField label="RCS" value={draft.setup.rcs} onChange={(v) => set(['setup', 'rcs'], v)} />
            <NumberField label="WhatsApp (conta)" value={draft.setup.whatsapp} onChange={(v) => set(['setup', 'whatsapp'], v)} />
          </div>
        </div>

        {/* PREÇOS FLAT */}
        <div className="card card-full">
          <div className="card-title">Preços Unitários — Demais Canais</div>
          <div className="field-row cols-3">
            <NumberField label="RCS Conversacional/Sessão" value={draft.precos.rcs_conversacional} onChange={(v) => set(['precos', 'rcs_conversacional'], v)} />
            <NumberField label="RCS Básico" value={draft.precos.rcs_basico} onChange={(v) => set(['precos', 'rcs_basico'], v)} />
            <NumberField label="RCS Simples" value={draft.precos.rcs_simples} onChange={(v) => set(['precos', 'rcs_simples'], v)} />
            <NumberField label="Chatbot — por atendimento" value={draft.precos.chatbot_unit} onChange={(v) => set(['precos', 'chatbot_unit'], v)} />
            <NumberField label="Chatbot — franquia mínima" value={draft.precos.chatbot_franquia} onChange={(v) => set(['precos', 'chatbot_franquia'], v)} />
            <NumberField label="Voicebot — por robô" value={draft.precos.voicebot_unit} onChange={(v) => set(['precos', 'voicebot_unit'], v)} />
            <NumberField label="Voicebot — mínimo de robôs" value={draft.precos.voicebot_min_robos} onChange={(v) => set(['precos', 'voicebot_min_robos'], v)} />
            <NumberField label="Telegrama" value={draft.precos.telegrama} onChange={(v) => set(['precos', 'telegrama'], v)} />
            <NumberField label="Carnê" value={draft.precos.carne} onChange={(v) => set(['precos', 'carne'], v)} />
            <NumberField label="Cartório" value={draft.precos.cartorio_documento} onChange={(v) => set(['precos', 'cartorio_documento'], v)} />
            <NumberField label="Documentos Digital/Files/Link" value={draft.precos.documento_digital} onChange={(v) => set(['precos', 'documento_digital'], v)} />
            <NumberField label="WhatsApp Ativo — por envio" value={draft.precos.whats_ativo_envio} onChange={(v) => set(['precos', 'whats_ativo_envio'], v)} />
            <NumberField label="WhatsApp Receptivo — por conversa" value={draft.precos.whats_receptivo_conversa} onChange={(v) => set(['precos', 'whats_receptivo_conversa'], v)} />
            <NumberField label="SMS FAST/OTP" value={draft.precos.sms_fast_otp} onChange={(v) => set(['precos', 'sms_fast_otp'], v)} />
            <NumberField label="SMS Rota Exclusiva" value={draft.precos.sms_rota_exclusiva} onChange={(v) => set(['precos', 'sms_rota_exclusiva'], v)} />
            <NumberField label="SMS Sender ID" value={draft.precos.sms_sender_id} onChange={(v) => set(['precos', 'sms_sender_id'], v)} />
            <NumberField label="SMS Flash" value={draft.precos.sms_flash} onChange={(v) => set(['precos', 'sms_flash'], v)} />
            <NumberField label="Valida+" value={draft.precos.valida_mais} onChange={(v) => set(['precos', 'valida_mais'], v)} />
            <NumberField label="Enriquecimento Premium" value={draft.precos.enriquecimento_premium} onChange={(v) => set(['precos', 'enriquecimento_premium'], v)} />
            <NumberField label="Landing Page — por link" value={draft.precos.landing_page_link} onChange={(v) => set(['precos', 'landing_page_link'], v)} />
            <NumberField label="Portal de Negociação — mensal" value={draft.precos.portal_negociacao} onChange={(v) => set(['precos', 'portal_negociacao'], v)} />
            <NumberField label="E-mail PDF — manutenção mensal" value={draft.precos.email_pdf_manutencao} onChange={(v) => set(['precos', 'email_pdf_manutencao'], v)} />
            <NumberField label="E-mail PDF — por geração" value={draft.precos.email_pdf_geracao} onChange={(v) => set(['precos', 'email_pdf_geracao'], v)} />
            <NumberField label="Ads — por campanha (CPF/Email)" value={draft.precos.ads_campanha} onChange={(v) => set(['precos', 'ads_campanha'], v)} />
            <NumberField label="Ads — franquia mínima" value={draft.precos.ads_franquia} onChange={(v) => set(['precos', 'ads_franquia'], v)} />
            <NumberField label="Google/Meta Ads (criativos)" value={draft.precos.google_meta_ads} onChange={(v) => set(['precos', 'google_meta_ads'], v)} />
            <NumberField label="Carta Física" value={draft.precos.carta_fisica} onChange={(v) => set(['precos', 'carta_fisica'], v)} />
          </div>
        </div>

        {/* LIGA/DESLIGA BLOCOS DO DISCOVERY */}
        <div className="card card-full">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Blocos do Formulário de Discovery</span>
            <button
              type="button"
              className="btn-link btn-link-icon"
              onClick={toggleTodosBlocos}
              aria-label={todosBlocosVisiveis ? 'Ocultar todos' : 'Exibir todos'}
              title={todosBlocosVisiveis ? 'Ocultar todos' : 'Exibir todos'}
            >
              <EyeIcon open={todosBlocosVisiveis} />
            </button>
          </div>
          <p style={{ marginBottom: 10, color: '#555', fontSize: 13 }}>
            Desmarque um bloco inteiro (card de perguntas) para escondê-lo do Discovery nesta sessão — diferente de esconder um canal individual, abaixo.
          </p>
          <div className="checkbox-grid">
            {DISCOVERY_BLOCOS.map(({ key, label, substep }) => (
              <label key={key} className="checkbox-item">
                <input type="checkbox" checked={!blocosDesabilitados.has(key)} onChange={() => toggleBloco(key)} />
                <span>{label} <span style={{ color: '#999' }}>({SUBSTEP_LABEL[substep]})</span></span>
              </label>
            ))}
          </div>
        </div>

        {/* LIGA/DESLIGA CANAIS */}
        <div className="card card-full">
          <div className="card-title">Canais Visíveis no Discovery</div>
          <p style={{ marginBottom: 10, color: '#555', fontSize: 13 }}>
            Desmarque um canal para escondê-lo do checklist de Discovery nesta sessão.
          </p>
          <div className="canais-columns">
            {CANAIS_BLOCOS.map(({ bloco: nomeBloco, grupos }) => (
              <Fragment key={nomeBloco}>
                <div className="canal-bloco-label">{nomeBloco}</div>
                {grupos.map(({ grupo, itens }) => {
                  const todosVisiveis = itens.every((i) => !desabilitados.has(i.key))
                  return (
                  <div key={grupo} className="canal-grupo">
                    <div className="canal-grupo-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{grupo}</span>
                      <button
                        type="button"
                        className="btn-link btn-link-icon"
                        onClick={() => toggleGrupoCanais(itens)}
                        aria-label={todosVisiveis ? 'Ocultar' : 'Exibir'}
                        title={todosVisiveis ? 'Ocultar' : 'Exibir'}
                      >
                        <EyeIcon open={todosVisiveis} />
                      </button>
                    </div>
                    <div className="checkbox-grid">
                      {itens.map(({ key, label }) => (
                        <label key={key} className="checkbox-item">
                          <input type="checkbox" checked={!desabilitados.has(key)} onChange={() => toggleCanal(key)} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="card card-full actions">
          <button type="button" className="btn" onClick={handleSalvar}>Salvar Alterações</button>
          <button type="button" className="btn btn-secondary btn-hover-gray" onClick={handleCancelar}>Cancelar</button>
          <button type="button" className="btn btn-secondary btn-hover-gray" onClick={undoLast} disabled={!canUndo}>↩ Desfazer Última Alteração</button>
          <button type="button" className="btn btn-danger" onClick={handleRestaurar}>Restaurar Padrão</button>
          <button type="button" className="btn btn-secondary btn-hover-gray" onClick={handlePublicarBaseGeral} disabled={publicando} style={{ borderColor: '#0120eb', color: '#0120eb' }}>
            {session?.user ? (publicando ? 'Publicando...' : '🌐 Mudar Base de Preços Geral') : '🔒 Mudar Base de Preços Geral'}
          </button>
        </div>
      </div>
    </div>
  )
}
