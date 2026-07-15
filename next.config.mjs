/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /api/gerar-proposta lê templates/proposta-template.pptx do disco por caminho
  // (fs.readFile), não por import — o tracing automático da Vercel não enxerga esse
  // arquivo sozinho, então sem isso o binário fica de fora do bundle serverless.
  outputFileTracingIncludes: {
    '/**': ['./templates/**/*'],
  },
}
export default nextConfig
