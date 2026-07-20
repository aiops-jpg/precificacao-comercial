'use client'

import { useState, useRef, useLayoutEffect, Fragment } from 'react'
import { getCanaisBlocosAtivos } from '@/lib/canais'
import { blocoVisivel } from '@/lib/discoveryBlocos'
import { useConfig } from '@/lib/ConfigContext'

const SUBSTEPS = [
  { n: 1, label: 'Perfil' },
  { n: 2, label: 'Canais' },
  { n: 3, label: 'Infraestrutura' },
]

export default function DiscoveryForm({ data, onChange, onSubmit }) {
  const [subStep, setSubStep] = useState(1)
  const { config } = useConfig()
  const canaisBlocos = getCanaisBlocosAtivos(config)
  const bloco = (key) => blocoVisivel(config, key)

  // Todos os blocos do substep 1 devem ter a mesma altura da Régua de Recuperação
  // (o bloco mais alto) — medida em runtime porque o conteúdo/config pode mudar.
  // Só faz sentido no grid 2x2 (desktop/laptop) — abaixo de 640px o CSS empilha os
  // campos em 1 coluna (field-row.cols-2/cols-3 vira 1fr) e o conteúdo cresce bem
  // além dessa altura, então travar a altura ali clipava o input fora da caixa do card.
  const reguaRef = useRef(null)
  const [perfilBlocoHeight, setPerfilBlocoHeight] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useLayoutEffect(() => {
    if (subStep !== 1) return
    const medir = () => {
      setIsMobile(window.innerWidth <= 640)
      if (reguaRef.current) setPerfilBlocoHeight(reguaRef.current.offsetHeight)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [subStep, config])

  const toggleGrupoCanais = (itens) => {
    const keys = itens.map(i => i.key)
    const todosMarcados = keys.every(k => data.canais_ativos.includes(k))
    const next = todosMarcados
      ? data.canais_ativos.filter(k => !keys.includes(k))
      : [...new Set([...data.canais_ativos, ...keys])]
    onChange({ ...data, canais_ativos: next })
  }

  const set = (key, val) => onChange({ ...data, [key]: val })

  const setNum = (key, val, max = Infinity) => {
    const num = parseFloat(val)
    const clamped = (val === '' || isNaN(num)) ? val : String(Math.min(Math.max(num, 0), max))
    onChange({ ...data, [key]: clamped })
  }

  const handleCheckboxGroup = (val) => {
    const next = data.canais_falha.includes(val)
      ? data.canais_falha.filter(v => v !== val)
      : [...data.canais_falha, val]
    set('canais_falha', next)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (subStep < 3) {
      setSubStep(subStep + 1)
      window.scrollTo(0, 0)
      return
    }
    onSubmit()
  }

  const voltar = () => {
    setSubStep(subStep - 1)
    window.scrollTo(0, 0)
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <div className="substep-nav">
        {SUBSTEPS.map(s => (
          <div
            key={s.n}
            className={`substep-item ${subStep === s.n ? 'active' : subStep > s.n ? 'done' : ''}`}
            onClick={() => setSubStep(s.n)}
          >
            <span className="substep-number">{subStep > s.n ? '✓' : s.n}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {subStep === 1 && (
        <div className="grid grid-equal-height">
          {/* DADOS DA PROPOSTA */}
          {bloco('dados_proposta') && (
          <div className="card" style={{ maxHeight: isMobile ? undefined : 140 }}>
            <div className="card-title">📄 Dados da Proposta</div>
            <div className="field-row cols-2">
              <div className="field-group">
                <label>Nome do Cliente</label>
                <input type="text" value={data.nomeCliente} onChange={e => set('nomeCliente', e.target.value)} placeholder="Ex: Empresa XYZ Ltda" />
              </div>
              <div className="field-group">
                <label>Nº da Proposta</label>
                <input type="text" value={data.numeroProposta} onChange={e => set('numeroProposta', e.target.value)} placeholder="Ex: 2026-001" />
              </div>
            </div>
          </div>
          )}

          {/* PERFIL DA CARTEIRA */}
          {bloco('perfil_carteira') && (
          <div className="card" style={{ maxHeight: isMobile ? undefined : 140 }}>
            <div className="card-title">📋 Perfil da Carteira</div>
            <div className="field-row cols-3">
              <div className="field-group">
                <label>Q1. Volume total de CPFs/CNPJs ativos</label>
                <input type="number" min="0" value={data.cpfs} onChange={e => setNum('cpfs', e.target.value)} placeholder="Ex: 57600" />
              </div>
              <div className="field-group">
                <label>Q2. Volume total de faturas/cartões mensais</label>
                <input type="number" min="0" value={data.faturas} onChange={e => setNum('faturas', e.target.value)} placeholder="Ex: 75000" />
              </div>
              <div className="field-group">
                <label>Q2. Clientes adimplentes (%)</label>
                <div className="input-suffix">
                  <input type="number" value={data.pct_adimplentes} onChange={e => setNum('pct_adimplentes', e.target.value, 100)} placeholder="Ex: 70" min="0" max="100" />
                  <span className="suffix">%</span>
                </div>
                <span className="hint">Inadimplentes: {100 - (parseFloat(data.pct_adimplentes) || 0)}%</span>
              </div>
            </div>
          </div>
          )}

          {/* RÉGUA DE RECUPERAÇÃO */}
          {bloco('regua_recuperacao') && (
          <div className="card" ref={reguaRef}>
            <div className="card-title">📊 Régua de Recuperação</div>
            <div className="tooltip-banner">
              <span className="tooltip-icon">ⓘ</span>
              <span>Se o cliente <strong>não tiver jornada</strong>, perguntar a <strong>taxa de rolagem/atraso</strong> em cada marco. Caso tenha jornada, perguntar a <strong>taxa de recuperação</strong>.</span>
            </div>
            <div className="field-row cols-3">
              <div className="field-group">
                <label>Q3. Taxa em 30 dias (%)</label>
                <div className="input-suffix">
                  <input type="number" value={data.tx_recup_30} onChange={e => setNum('tx_recup_30', e.target.value, 100)} placeholder="Ex: 25" min="0" max="100" />
                  <span className="suffix">%</span>
                </div>
              </div>
              <div className="field-group">
                <label>Q3. Taxa em 60 dias (%)</label>
                <div className="input-suffix">
                  <input type="number" value={data.tx_recup_60} onChange={e => setNum('tx_recup_60', e.target.value, 100)} placeholder="Ex: 15" min="0" max="100" />
                  <span className="suffix">%</span>
                </div>
              </div>
              <div className="field-group">
                <label>Q3. Taxa em 90 dias (%)</label>
                <div className="input-suffix">
                  <input type="number" value={data.tx_recup_90} onChange={e => setNum('tx_recup_90', e.target.value, 100)} placeholder="Ex: 8" min="0" max="100" />
                  <span className="suffix">%</span>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* SEGMENTO & OBJETIVO */}
          {bloco('segmento_objetivo') && (
          <div className="card" style={{ minHeight: isMobile ? undefined : (perfilBlocoHeight || undefined) }}>
            <div className="card-title">🎯 Segmento &amp; Objetivo</div>
            <div className="field-row cols-2">
              <div className="field-group">
                <label>Q4. A comunicação será B2C ou B2B?</label>
                <select value={data.tipo_cliente} onChange={e => set('tipo_cliente', e.target.value)}>
                  <option value="">— Selecione —</option>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                  <option value="Ambos">Ambos</option>
                </select>
              </div>
              <div className="field-group">
                <label>Q5. Principal objetivo da comunicação</label>
                <select value={data.objetivo} onChange={e => set('objetivo', e.target.value)}>
                  <option value="">— Selecione —</option>
                  <option value="Preventivo (aviso antes do vencimento)">Preventivo — Aviso antes do vencimento</option>
                  <option value="Atraso curto (D+1 a D+15)">Atraso curto — D+1 a D+15</option>
                  <option value="Recuperação de longo prazo (D+30+)">Recuperação de longo prazo — D+30+</option>
                  <option value="Preventivo manutenção de parcelas">Preventivo — Manutenção dos pagamentos das parcelas</option>
                </select>
                <span className="hint">
                  Preventivo: antes do vencimento | Atraso curto: D+1 a D+15 | Longo prazo: D+30+
                </span>
              </div>
            </div>
          </div>
          )}

          <div className="card card-full actions">
            <button type="submit" className="btn">
              Avançar: Canais →
            </button>
          </div>
        </div>
      )}

      {subStep === 2 && (
        <div className="grid">
          {/* CANAIS */}
          {bloco('canais_estrategia') && (
          <div className="card card-full">
            <div className="card-title">📡 Canais da Estratégia</div>
            <div className="tooltip-banner">
              <span className="tooltip-icon">ⓘ</span>
              <span>Selecione quais produtos serão usados. Apenas os marcados aparecerão na calculadora.</span>
            </div>
            <div className="canais-columns">
              {canaisBlocos.map(({ bloco: nomeBloco, grupos }) => (
                <Fragment key={nomeBloco}>
                  <div className="canal-bloco-label">{nomeBloco}</div>
                  {grupos.map(({ grupo, itens }) => {
                    const todosMarcados = itens.every(i => data.canais_ativos.includes(i.key))
                    return (
                    <div key={grupo} className="canal-grupo">
                      <div className="canal-grupo-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{grupo}</span>
                        <button type="button" className="btn-link" onClick={() => toggleGrupoCanais(itens)}>
                          {todosMarcados ? 'Nenhum' : 'Todos'}
                        </button>
                      </div>
                      <div className="checkbox-grid">
                        {itens.map(({ key, label }) => (
                          <label key={key} className="checkbox-item">
                            <input
                              type="checkbox"
                              checked={data.canais_ativos.includes(key)}
                              onChange={() => {
                                const next = data.canais_ativos.includes(key)
                                  ? data.canais_ativos.filter(v => v !== key)
                                  : [...data.canais_ativos, key]
                                onChange({ ...data, canais_ativos: next })
                              }}
                            />
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
          )}

          {/* CANAIS QUE FALHARAM */}
          {bloco('canais_falha') && (
          <div className="card card-full">
            <div className="card-title">🚫 Canais que Tentaram e Não Funcionaram</div>
            <div className="tooltip-banner">
              <span className="tooltip-icon">ⓘ</span>
              <span>Q10. Para explorar com o cliente — marque os canais já testados sem sucesso.</span>
            </div>
            <div className="checkbox-grid">
              {['SMS', 'WhatsApp', 'Voz', 'RCS', 'E-mail', 'Chat', 'Google / Meta Ads', 'Cartas / Físico'].map(canal => (
                <label key={canal} className="checkbox-item">
                  <input type="checkbox" checked={data.canais_falha.includes(canal)} onChange={() => handleCheckboxGroup(canal)} />
                  <span>{canal}</span>
                </label>
              ))}
            </div>
          </div>
          )}

          <div className="card card-full actions">
            <button type="button" className="btn btn-secondary" onClick={voltar}>← Voltar</button>
            <button type="submit" className="btn">Avançar: Infraestrutura →</button>
          </div>
        </div>
      )}

      {subStep === 3 && (
        <div className="grid">
          {/* JORNADA & AUTOMAÇÃO */}
          {bloco('jornada_automacao') && (
          <div className="card card-full">
            <div className="card-title">⚙️ Jornada &amp; Automação</div>
            <div className="field-row cols-2">
              <div className="field-group">
                <label>Q7. Existe automação de estímulos ou jornada que já utilizam?</label>
                <div className="radio-group">
                  <label className="radio-inline">
                    <input type="radio" name="tem_automacao" checked={data.tem_automacao === 'Sim'} onChange={() => set('tem_automacao', 'Sim')} />
                    <span>Sim</span>
                  </label>
                  <label className="radio-inline">
                    <input type="radio" name="tem_automacao" checked={data.tem_automacao === 'Não'} onChange={() => set('tem_automacao', 'Não')} />
                    <span>Não</span>
                  </label>
                </div>
              </div>
              <div className="field-group">
                <label>Q9. Se não tiver jornada, qual o direcionamento?</label>
                <textarea value={data.direcionamento} onChange={e => set('direcionamento', e.target.value)} rows={2} placeholder="Ex: régua manual, disparo único, campanha avulsa..." />
              </div>
            </div>
          </div>
          )}

          {/* INFRAESTRUTURA & DADOS */}
          {bloco('infra_dados') && (
          <div className="card card-full">
            <div className="card-title">🔧 Infraestrutura &amp; Dados</div>
            <div className="field-row cols-3">
              <div className="field-group">
                <label>Q8. Sistema usado para registro das dívidas</label>
                <input type="text" value={data.sistema_dividas} onChange={e => set('sistema_dividas', e.target.value)} placeholder="Ex: Oracle, Prosoft, interno..." />
              </div>
              <div className="field-group">
                <label>Q11. Qualidade dos dados de contato</label>
                <select value={data.qualidade_dados} onChange={e => set('qualidade_dados', e.target.value)}>
                  <option value="">— Selecione —</option>
                  <option value="Boa">Boa</option>
                  <option value="Regular">Regular</option>
                  <option value="Ruim">Ruim</option>
                  <option value="Não sabe">Não sabe</option>
                </select>
              </div>
              <div className="field-group">
                <label>Q13. SLA esperado para envio das cargas</label>
                <select value={data.sla_cargas} onChange={e => set('sla_cargas', e.target.value)}>
                  <option value="">— Selecione —</option>
                  <option value="Diário">Diário</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Quinzenal">Quinzenal</option>
                  <option value="Mensal">Mensal</option>
                </select>
              </div>
            </div>

            <div className="field-group" style={{ marginTop: 16 }}>
              <label>Q12. Será necessário desenvolver APIs? Em quais pontos?</label>
              <div className="checkbox-grid cols-3">
                <label className="checkbox-item">
                  <input type="checkbox" checked={data.api_carga} onChange={e => set('api_carga', e.target.checked)} />
                  <span>Carga e atualização da base diária</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={data.api_consulta} onChange={e => set('api_consulta', e.target.checked)} />
                  <span>Consultar informações para negociação</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={data.api_boleto} onChange={e => set('api_boleto', e.target.checked)} />
                  <span>Gerar instrumento de pagamento (boleto)</span>
                </label>
              </div>
            </div>

            <div className="field-group" style={{ marginTop: 16 }}>
              <label>Já tem broker/própria plataforma ou precisa da PGMais?</label>
              <div className="tooltip-banner" style={{ marginBottom: 10 }}>
                <span className="tooltip-icon">ⓘ</span>
                <span>Q10 extra — Para explorar com o cliente.</span>
              </div>
              <div className="radio-group">
                <label className="radio-inline">
                  <input type="radio" name="broker" checked={data.broker === 'Já temos broker/própria plataforma'} onChange={() => set('broker', 'Já temos broker/própria plataforma')} />
                  <span>Já temos broker / plataforma própria</span>
                </label>
                <label className="radio-inline">
                  <input type="radio" name="broker" checked={data.broker === 'Precisamos da estrutura completa da PGMais'} onChange={() => set('broker', 'Precisamos da estrutura completa da PGMais')} />
                  <span>Precisamos da estrutura completa da PGMais</span>
                </label>
              </div>
            </div>
          </div>
          )}

          <div className="card card-full actions">
            <button type="button" className="btn btn-secondary" onClick={voltar}>← Voltar</button>
            <button type="submit" className="btn">Avançar para Calculadora →</button>
          </div>
        </div>
      )}
    </form>
  )
}
