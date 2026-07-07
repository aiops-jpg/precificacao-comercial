import nodemailer from 'nodemailer'

export async function POST(req) {
  try {
    const { to, subject, html, pdfBase64, pdfName } = await req.json()

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject: subject || 'Proposta Comercial — PGMais',
      html: html || 'Segue em anexo a proposta comercial.',
      attachments: pdfBase64 ? [
        {
          filename: pdfName || 'proposta-pgmais.pdf',
          content: pdfBase64,
          encoding: 'base64',
        },
      ] : [],
    }

    await transporter.sendMail(mailOptions)
    return Response.json({ success: true })
  } catch (err) {
    console.error('Send email error:', err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
