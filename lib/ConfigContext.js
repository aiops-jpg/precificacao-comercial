'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { PRICING_DEFAULTS } from './pricingDefaults'

const STORAGE_KEY = 'pgmais_pricing_config_override'
const UNDO_KEY = 'pgmais_pricing_config_undo'

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Faz merge de uma config salva (sessionStorage) sobre os padrões atuais — sem isso, uma
// sessão salva ANTES de o catálogo de produtos mudar (ex: campo novo em faixas/precos) fica
// faltando chaves e quebra o cálculo. Objetos são mesclados recursivamente; arrays e valores
// primitivos vêm inteiros do salvo quando presentes (uma faixa editada não deve ser mesclada
// item a item com o padrão).
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

// Config de preços com sobrescrita por sessão: o Comercial pode editar faixas/fórmulas
// em /config, mas nada é salvo em banco — some ao fechar a aba e sempre reabre no padrão.
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(PRICING_DEFAULTS)
  const [canUndo, setCanUndo] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  // Ref (não state) guarda o valor "anterior" pra virar o snapshot de undo — setConfig updaters
  // rodam duas vezes em dev/StrictMode, então side effects (sessionStorage) não podem morar ali.
  const configRef = useRef(config)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const merged = mergeComPadrao(PRICING_DEFAULTS, JSON.parse(saved))
        configRef.current = merged
        setConfig(merged)
      }
      setCanUndo(!!sessionStorage.getItem(UNDO_KEY))
    } catch {
      // sessionStorage indisponível (SSR/privado) — segue com o padrão
    }
    setHydrated(true)
  }, [])

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
    const cloned = clone(PRICING_DEFAULTS)
    persist(cloned, prev)
    configRef.current = cloned
    setConfig(cloned)
  }, [persist])

  const undoLast = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(UNDO_KEY)
      if (!saved) return
      const restored = mergeComPadrao(PRICING_DEFAULTS, JSON.parse(saved))
      configRef.current = restored
      setConfig(restored)
      sessionStorage.setItem(STORAGE_KEY, saved)
      sessionStorage.removeItem(UNDO_KEY)
      setCanUndo(false)
    } catch {
      // nada a desfazer
    }
  }, [])

  const isCustom = JSON.stringify(config) !== JSON.stringify(PRICING_DEFAULTS)

  return (
    <ConfigContext.Provider value={{ config, updateConfig, resetToDefault, undoLast, canUndo, isCustom, hydrated }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig precisa estar dentro de <ConfigProvider>')
  return ctx
}
