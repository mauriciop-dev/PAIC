import { Layout } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Layout
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/mauriciop-dev/paic-docs/tree/main"
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
