/**
 * DuckDuckGo Lite — query the public HTML form at lite.duckduckgo.com.
 *
 * Unlike the duck-duck-scrape library (which hits the main DDG HTML endpoint
 * and is aggressively rate-limited from datacenter IPs), `lite.duckduckgo.com`
 * is a lightweight, no-JS HTML form that's publicly available and has not
 * historically rate-limited bot traffic.
 *
 * Trade-offs:
 * - Lower result quality than the main DDG endpoint (often 5-15 results vs
 *   30+ from the main scraper).
 * - No abstract/snippet extraction for some queries — we parse what we can.
 * - No support for `safeSearch` parameter (the lite UI doesn't expose it).
 *
 * This provider is the **default fallback** in the auto chain (alongside the
 * `duckduckgo` scraper) because it works in restrictive networks where the
 * main DDG HTML endpoint blocks datacenter traffic.
 */

import { JSDOM } from 'jsdom'
import type { SearchInput, SearchProvider } from './types.js'
import { applyDomainFilters, type ProviderOutput } from './types.js'

const LITE_ENDPOINT = 'https://lite.duckduckgo.com/lite/'
const LITE_PARAMS = new URLSearchParams({
  // Force the lite UI to skip its JS-driven redirect
  kl: 'us-en',
  kp: '-2',
  kaf: '1',
  kaf1: '1',
  kaf2: '1',
  kaf3: '1',
  kac: '-1',
})
const MAX_RETRIES = 2
const INITIAL_BACKOFF_MS = 500
const REQUEST_TIMEOUT_MS = 8000

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

interface ParsedHit {
  title: string
  url: string
  description?: string
}

function parseLiteHtml(html: string): ParsedHit[] {
  const hits: ParsedHit[] = []
  let dom: JSDOM
  try {
    dom = new JSDOM(html)
  } catch {
    return []
  }

  const document = dom.window.document
  // The lite UI renders results inside <tr class="result-link"> and
  // <tr class="result-snippet"> pairs (alternating). We walk the document
  // and pair them up.
  const linkRows = document.querySelectorAll('tr.result-link, .result-link')
  const snippetRows = document.querySelectorAll(
    'tr.result-snippet, .result-snippet',
  )

  for (let i = 0; i < linkRows.length; i++) {
    const linkEl = linkRows[i] as HTMLElement
    const a = linkEl.querySelector('a.result-link-a, a[href]')
    if (!a) continue
    const url = a.getAttribute('href') || ''
    const title = (a.textContent || '').trim()
    if (!url || !title) continue
    // DDG wraps target URLs through /l/?uddg=...; un-wrap if present
    const unwrapped = unwrapRedirect(url)
    if (!unwrapped) continue

    let description: string | undefined
    const snip = snippetRows[i] as HTMLElement | undefined
    if (snip) {
      description = (snip.textContent || '').trim().replace(/\s+/g, ' ')
      if (description.length > 280) description = description.slice(0, 277) + '...'
    }
    hits.push({ title, url: unwrapped, description })
  }

  // Fallback for older or alternate renderings: parse any <a class="result-link-a">.
  if (hits.length === 0) {
    const anchors = document.querySelectorAll('a.result-link-a, a.result__a')
    anchors.forEach(a => {
      const url = a.getAttribute('href') || ''
      const title = (a.textContent || '').trim()
      const unwrapped = unwrapRedirect(url)
      if (unwrapped && title) {
        hits.push({ title, url: unwrapped })
      }
    })
  }

  return hits
}

function unwrapRedirect(href: string): string | null {
  // DDG lite wraps target URLs in a /l/ redirect. Decode `uddg=...`.
  try {
    const u = new URL(href, LITE_ENDPOINT)
    const uddg = u.searchParams.get('uddg')
    if (uddg) return decodeURIComponent(uddg)
    // Some lite variants return absolute URLs directly
    if (u.hostname.endsWith('duckduckgo.com')) return null
    return u.toString()
  } catch {
    return null
  }
}

export const duckduckgoLiteProvider: SearchProvider = {
  name: 'duckduckgo-lite',

  isConfigured() {
    // No API key required; the lite endpoint is publicly accessible.
    return true
  },

  async search(input: SearchInput, signal?: AbortSignal): Promise<ProviderOutput> {
    const start = performance.now()

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const body = LITE_PARAMS.toString()
    let lastErr: unknown

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      try {
        const controller = new AbortController()
        const onAbort = () => controller.abort()
        if (signal) signal.addEventListener('abort', onAbort, { once: true })
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        try {
          const response = await fetch(LITE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent':
                'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            body: body + '&q=' + encodeURIComponent(input.query),
            signal: controller.signal,
          })
          clearTimeout(timer)
          if (signal) signal.removeEventListener('abort', onAbort)

          if (!response.ok) {
            throw new Error(
              `DuckDuckGo Lite returned HTTP ${response.status} ${response.statusText}`,
            )
          }
          const html = await response.text()
          const parsed = parseLiteHtml(html)
          if (parsed.length === 0) {
            // The response was 200 but had no results — could be a temporary
            // empty page; treat as a soft failure and retry.
            throw new Error('DuckDuckGo Lite returned an empty result page')
          }
          const hits = applyDomainFilters(parsed, input)
          return {
            hits,
            providerName: 'duckduckgo-lite',
            durationSeconds: (performance.now() - start) / 1000,
          }
        } finally {
          clearTimeout(timer)
          if (signal) signal.removeEventListener('abort', onAbort)
        }
      } catch (err) {
        lastErr = err
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        if (attempt === MAX_RETRIES - 1) break
        const baseDelay = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
        const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1)
        await sleep(baseDelay + jitter)
      }
    }

    throw new Error(
      `DuckDuckGo Lite search failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    )
  },
}
