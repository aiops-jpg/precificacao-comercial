// Cada card/bloco de pergunta do formulário de Discovery — controlável em /config,
// independente do liga/desliga por canal (que já existe em lib/canais.js).
export const DISCOVERY_BLOCOS = [
  { key: 'dados_proposta', label: 'Dados da Proposta', substep: 1 },
  { key: 'perfil_carteira', label: 'Perfil da Carteira', substep: 1 },
  { key: 'regua_recuperacao', label: 'Régua de Recuperação', substep: 1 },
  { key: 'segmento_objetivo', label: 'Segmento & Objetivo', substep: 1 },
  { key: 'canais_estrategia', label: 'Canais da Estratégia', substep: 2 },
  { key: 'canais_falha', label: 'Canais que Tentaram e Não Funcionaram', substep: 2 },
  { key: 'jornada_automacao', label: 'Jornada & Automação', substep: 3 },
  { key: 'infra_dados', label: 'Infraestrutura & Dados', substep: 3 },
]

export function blocoVisivel(config, key) {
  return !(config?.blocosDesabilitados || []).includes(key)
}
