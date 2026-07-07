'use client'

export default function DiscoveryForm({ data, onChange, onSubmit }) {
  const set = (key, val) => onChange({ ...data, [key]: val })

  const handleCheckboxGroup = (val) => {
    const next = data.canais_falha.includes(val)
      ? data.canais_falha.filter(v => v !== val)
      : [...data.canais_falha, val]
    set('canais_falha', next)
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit() }}>
      <div className="grid">
        {/* PERFIL DA CARTEIRA */}
        <div className="card card-full">
          <div className="card-title">📋 Perfil da Carteira</div>
          <div className="field-row cols-3">
            <div className="field-group">
              <label>Q1. Volume total de CPFs/CNPJs ativos</label>
              <input type="number" value={data.cpfs} onChange={e => set('cpfs', e.target.value)} placeholder="Ex: 57600" />
            </div>
            <div className="field-group">
              <label>Q2. Volume total de faturas/cartões mensais</label>
              <input type="number" value={data.faturas} onChange={e => set('faturas', e.target.value)} placeholder="Ex: 75000" />
            </div>
            <div className="field-group">
              <label>Q2. Clientes adimplentes (%)</label>
              <div className="input-suffix">
                <input type="number" value={data.pct_adimplentes} onChange={e => set('pct_adimplentes', e.target.value)} placeholder="Ex: 70" min="0" max="100" />
                <span className="suffix">%</span>
              </div>
              <span className="hint">Inadimplentes: {100 - (parseFloat(data.pct_adimplentes) || 0)}%</span>
            </div>
          </div>
        </div>

        {/* RÉGUA DE RECUPERAÇÃO */}
        <div className="card card-full">
          <div className="card-title">📊 Régua de Recuperação</div>
          <div className="tooltip-banner">
            <span className="tooltip-icon">ⓘ</span>
            <span>Se o cliente <strong>não tiver jornada</strong>, perguntar a <strong>taxa de rolagem/atraso</strong> em cada marco. Caso tenha jornada, perguntar a <strong>taxa de recuperação</strong>.</span>
          </div>
          <div className="field-row cols-3">
            <div className="field-group">
              <label>Q3. Taxa em 30 dias (%)</label>
              <div className="input-suffix">
                <input type="number" value={data.tx_recup_30} onChange={e => set('tx_recup_30', e.target.value)} placeholder="Ex: 25" min="0" max="100" />
                <span className="suffix">%</span>
              </div>
            </div>
            <div className="field-group">
              <label>Q3. Taxa em 60 dias (%)</label>
              <div className="input-suffix">
                <input type="number" value={data.tx_recup_60} onChange={e => set('tx_recup_60', e.target.value)} placeholder="Ex: 15" min="0" max="100" />
                <span className="suffix">%</span>
              </div>
            </div>
            <div className="field-group">
              <label>Q3. Taxa em 90 dias (%)</label>
              <div className="input-suffix">
                <input type="number" value={data.tx_recup_90} onChange={e => set('tx_recup_90', e.target.value)} placeholder="Ex: 8" min="0" max="100" />
                <span className="suffix">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEGMENTO & OBJETIVO */}
        <div className="card card-full">
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

        {/* CANAIS */}
        <div className="card card-full">
          <div className="card-title">📡 Canais da Estratégia</div>
          <div className="tooltip-banner">
            <span className="tooltip-icon">ⓘ</span>
            <span>Selecione quais canais serão usados. Apenas os marcados aparecerão na calculadora.</span>
          </div>
          <div className="checkbox-grid">
            {['SMS', 'WhatsApp', 'Canais Digitais', 'ONE', 'Outros Canais'].map(canal => (
              <label key={canal} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={data.canais_ativos.includes(canal)}
                  onChange={() => {
                    const next = data.canais_ativos.includes(canal)
                      ? data.canais_ativos.filter(v => v !== canal)
                      : [...data.canais_ativos, canal]
                    onChange({ ...data, canais_ativos: next })
                  }}
                />
                <span>{canal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* JORNADA & AUTOMAÇÃO */}
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

        {/* CANAIS QUE FALHARAM */}
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

        {/* INFRAESTRUTURA & DADOS */}
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

        {/* AÇÃO */}
        <div className="card card-full actions">
          <button type="submit" className="btn">
            Avançar para Calculadora →
          </button>
        </div>
      </div>
    </form>
  )
}
