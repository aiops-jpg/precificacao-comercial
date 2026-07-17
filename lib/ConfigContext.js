'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { PRICING_DEFAULTS } from './pricingDefaults'

const STORAGE_KEY = 'pgmais_pricing_config_override'
const UNDO_KEY = 'pgmais_pricing_config_undo'

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Faz merge de uma config salva (sessionStorage) sobre a base atual — sem isso, uma sessão
// salva ANTES de o catálogo de produtos mudar (ex: campo novo em faixas/precos) fica faltando
// chaves e quebra o cálculo. Objetos são mesclados recursivamente; arrays e valores primitivos
// vêm inteiros do salvo quando presentes (uma faixa editada não deve ser mesclada item a item
// com o padrão).
function mergeComPadrao(padrao, salvo) {
  if (salvo === undefined || salvo === null) return clone(padrao)
  if (Array.isArray(padrao) || typeof padrao !== 'object') return salvo
  const resultado = {}
  for (const chave of Object.keys(padrao)) {
    resultado[chave] = mergeComPadrao(padrao[chave], salvo[chave])
  }
  return resultado
}

const ConfigContext = createContext(null)

// Config de preços em duas camadas:
// 1) Base GERAL — vem do banco (/api/pricing-base), só admin logado muda, afeta todo mundo.
// 2) Sobrescrita por SESSÃO — o Comercial pode ajustar por cima em /config, mas isso não é
//    salvo em banco: some ao fechar a aba e sempre reabre na base geral vigente.
export function ConfigProvider({ children }) {
  const [baseGeral, setBaseGeral] = useState(PRICING_DEFAULTS)
  const [config, setConfig] = useState(PRICING_DEFAULTS)
  const [canUndo, setCanUndo] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  // Ref (não state) guarda o valor "anterior" pra virar o snapshot de undo — setConfig updaters
  // rodam duas vezes em dev/StrictMode, então side effects (sessionStorage) não podem morar ali.
  const configRef = useRef(config)

  const carregar = useCallback(async () => {
    let base = PRICING_DEFAULTS
    try {
      const resp = await fetch('/api/pricing-base')
      if (resp.ok) base = await resp.json()
    } catch {
      // API/banco indisponível — segue com o padrão do arquivo local
    }
    setBaseGeral(base)
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      const atual = saved ? mergeComPadrao(base, JSON.parse(saved)) : clone(base)
      configRef.current = atual
      setConfig(atual)
      setCanUndo(!!sessionStorage.getItem(UNDO_KEY))
    } catch {
      configRef.current = clone(base)
      setConfig(clone(base))
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const persist = useCallback((next, prevForUndo) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      if (prevForUndo !== undefined) {
        sessionStorage.setItem(UNDO_KEY, JSON.stringify(prevForUndo))
        setCanUndo(true)
      }
    } catch {
      // ignora falha de persistência — a sessão em memória continua funcionando
    }
  }, [])

  const updateConfig = useCallback((next) => {
    const prev = configRef.current
    const cloned = clone(next)
    persist(cloned, prev)
    configRef.current = cloned
    setConfig(cloned)
  }, [persist])

  const resetToDefault = useCallback(() => {
    const prev = configRef.current
    const cloned = clone(baseGeral)
    persist(cloned, prev)
    configRef.current = cloned
    setConfig(cloned)
  }, [persist, baseGeral])

  const undoLast = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(UNDO_KEY)
      if (!saved) return
      const restored = mergeComPadrao(baseGeral, JSON.parse(saved))
      configRef.current = restored
      setConfig(restored)
      sessionStorage.setItem(STORAGE_KEY, saved)
      sessionStorage.removeItem(UNDO_KEY)
      setCanUndo(false)
    } catch {
      // nada a desfazer
    }
  }, [baseGeral])

  // Publica a base geral e limpa a sobrescrita local desta sessão, pra já refletir o que
  // acabou de ser salvo (em vez de continuar vendo a edição antiga por cima).
  const publicarBaseGeral = useCallback(async (novaBase) => {
    const resp = await fetch('/api/pricing-base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novaBase),
    })
    if (!resp.ok) throw new Error(await resp.text())
    try {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(UNDO_KEY)
    } catch { /* noop */ }
    const cloned = clone(novaBase)
    setBaseGeral(cloned)
    configRef.current = cloned
    setConfig(cloned)
    setCanUndo(false)
  }, [])

  const isCustom = JSON.stringify(config) !== JSON.stringify(baseGeral)

  return (
    <ConfigContext.Provider value={{ config, updateConfig, resetToDefault, undoLast, canUndo, isCustom, hydrated, publicarBaseGeral }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig precisa estar dentro de <ConfigProvider>')
  return ctx
}
