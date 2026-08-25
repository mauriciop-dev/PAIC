import type { MDXComponents } from 'mdx/types'
import { useMDXComponents as getDocsComponents } from 'nextra-theme-docs'

const docsComponents = getDocsComponents({})

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...docsComponents, ...components }
}
