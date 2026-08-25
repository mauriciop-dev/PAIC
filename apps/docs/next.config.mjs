import nextra from 'nextra'

const withNextra = nextra({})

export default withNextra({
  outputFileTracingRoot: new URL('.', import.meta.url).pathname,
})
