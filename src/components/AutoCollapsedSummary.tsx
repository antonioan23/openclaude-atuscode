/**
 * AutoCollapsedSummary — visual collapse for long TUI transcripts.
 *
 * 0.18.12 FEATURE: when the transcript gets too long, this component
 * auto-collapses the older messages into a single dismissible summary
 * line. The user can press ctrl+o (app:toggleTranscript) to expand
 * the full history. The TUI then never has to render dozens of full
 * tool-call blocks, which is what causes the display bugs in long
 * sessions (overflowing lines, broken color codes, garbled spacing,
 * frozen frames on slow terminals).
 *
 * Unlike CompactSummary, this does NOT call the API to summarize the
 * messages — the underlying conversation state is unchanged. This is
 * a pure-rendering optimization.
 *
 * Activation:
 *   - `ATUSCODE_AUTO_COLLAPSE_THRESHOLD` env var (default 30 messages)
 *   - Skipped when the user has already expanded the transcript
 *     (isTranscriptMode === true)
 *   - Skipped for sub-agents (only the top-level transcript collapses)
 */

import React, { useMemo } from 'react'
import { Box, Text } from '../ink.js'
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js'
import { CtrlOToExpand } from './CtrlOToExpand.js'
import { MessageResponse } from './MessageResponse.js'

type Props = {
  totalMessages: number
  collapsedCount: number
  /** First visible message index in the rendered list */
  firstVisibleIndex: number
}

/**
 * Read the auto-collapse threshold from env.
 * 0 disables the feature entirely.
 */
export function getAutoCollapseThreshold(): number {
  const raw = process.env.ATUSCODE_AUTO_COLLAPSE_THRESHOLD
  if (raw == null) return 30
  const trimmed = raw.trim()
  if (trimmed === '') return 30
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 30
  return parsed
}

/**
 * Decide whether to collapse. Returns the number of leading messages
 * to hide if collapse should fire; 0 if no collapse.
 */
export function getCollapseCount(
  totalMessages: number,
  threshold: number,
  isTranscriptMode: boolean,
): number {
  if (threshold <= 0) return 0
  if (isTranscriptMode) return 0
  if (totalMessages <= threshold) return 0
  // Hide everything except the last `threshold / 2` messages.
  // This keeps recent context visible while collapsing the long tail.
  const tail = Math.max(5, Math.floor(threshold / 2))
  return Math.max(0, totalMessages - tail)
}

export function AutoCollapsedSummary({ totalMessages, collapsedCount, firstVisibleIndex }: Props) {
  const threshold = useMemo(() => getAutoCollapseThreshold(), [])
  return React.createElement(
    MessageResponse,
    null,
    React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(
        Text,
        { dimColor: true },
        `✦ Auto-collapsed ${collapsedCount} of ${totalMessages} messages (threshold: ${threshold})`,
      ),
      React.createElement(
        Text,
        { dimColor: true },
        React.createElement(ConfigurableShortcutHint, {
          action: 'app:toggleTranscript',
          context: 'Global',
          fallback: 'ctrl+o',
          description: 'expand history',
          parens: true,
        }),
        ' to expand the conversation',
      ),
    ),
  )
}

export default AutoCollapsedSummary
