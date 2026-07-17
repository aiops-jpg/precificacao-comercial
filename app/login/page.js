'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/config'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    const res = await signIn('credentials', { email, password: senha, redirect: false })
    setEntrando(false)
    if (res?.error) {
      setErro('E-mail ou senha incorretos.')
      return
    }
    router.push(callbackUrl)
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 80 }}>
      <div className="card card-full">
        <div className="card-title">Acesso à Base de Preços Geral</div>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@pgmais.com.br" required />
          </div>
          <div className="field-group">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          {erro && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{erro}</p>}
          <button type="submit" className="btn" disabled={entrando} style={{ width: '100%' }}>
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
