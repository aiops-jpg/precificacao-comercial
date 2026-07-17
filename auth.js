import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getPool } from './lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const pool = getPool()
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [credentials.email])
        const user = rows[0]
        if (!user) return null
        const valido = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valido) return null
        return { id: String(user.id), email: user.email }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  trustHost: true,
})
