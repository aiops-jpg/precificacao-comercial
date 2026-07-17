import './globals.css'
import { ConfigProvider } from '../lib/ConfigContext'
import Providers from '../components/Providers'

export const metadata = {
  title: 'Precificação Comercial — PGMais',
  description: 'Calculadora de orçamento — Tabela de Preços Maio 2026',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <ConfigProvider>{children}</ConfigProvider>
        </Providers>
      </body>
    </html>
  )
}
