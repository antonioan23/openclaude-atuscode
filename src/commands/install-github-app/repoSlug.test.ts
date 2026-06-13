import assert from 'node:assert/strict'
import test from 'node:test'

import { extractGitHubRepoSlug } from './repoSlug.ts'

test('keeps owner/repo input as-is', () => {
  assert.equal(extractGitHubRepoSlug('atuscode/atuscode'), 'atuscode/atuscode')
})

test('extracts slug from https GitHub URLs', () => {
  assert.equal(
    extractGitHubRepoSlug('https://github.com/atuscode/atuscode'),
    'atuscode/atuscode',
  )
  assert.equal(
    extractGitHubRepoSlug('https://www.github.com/atuscode/atuscode.git'),
    'atuscode/atuscode',
  )
})

test('extracts slug from ssh GitHub URLs', () => {
  assert.equal(
    extractGitHubRepoSlug('git@github.com:atuscode/atuscode.git'),
    'atuscode/atuscode',
  )
  assert.equal(
    extractGitHubRepoSlug('ssh://git@github.com/atuscode/atuscode'),
    'atuscode/atuscode',
  )
})

test('rejects malformed or non-GitHub URLs', () => {
  assert.equal(extractGitHubRepoSlug('https://gitlab.com/atuscode/atuscode'), null)
  assert.equal(extractGitHubRepoSlug('https://github.com/AtusCode'), null)
  assert.equal(extractGitHubRepoSlug('not actually github.com/atuscode/atuscode'), null)
  assert.equal(
    extractGitHubRepoSlug('https://evil.example/?next=github.com/atuscode/atuscode'),
    null,
  )
  assert.equal(
    extractGitHubRepoSlug('https://github.com.evil.example/atuscode/atuscode'),
    null,
  )
  assert.equal(
    extractGitHubRepoSlug('https://example.com/github.com/atuscode/atuscode'),
    null,
  )
})
