"use client"

import type React from "react"
import { useState, useMemo } from "react"
import styles from "./SQLDiffHighlighter.module.css"

type ComparisonType = "Lines" | "Words" | "Characters"

interface DiffLine {
  type: "added" | "removed" | "modified" | "unchanged"
  originalContent: string
  modifiedContent: string
  originalLineNumber: number
  modifiedLineNumber: number
  isCollapsed?: boolean
}

interface DiffBlock {
  type: "changed" | "unchanged"
  lines: DiffLine[]
  startLine: number
  endLine: number
}

const SQLDiffHighlighter: React.FC = () => {
  const [originalSQL, setOriginalSQL] = useState<string>("")
  const [modifiedSQL, setModifiedSQL] = useState<string>("")
  const [comparisonType, setComparisonType] = useState<ComparisonType>("Lines")
  const [showUnchanged, setShowUnchanged] = useState<boolean>(false)

  // Split text based on comparison type
  const splitText = (text: string, type: ComparisonType): string[] => {
    switch (type) {
      case "Lines":
        return text.split("\n")
      case "Words":
        return text.split(/(\s+)/).filter((part) => part.length > 0)
      case "Characters":
        return text.split("")
      default:
        return []
    }
  }

  // Simple LCS-based diff algorithm
  const computeDiff = (original: string[], modified: string[]): DiffLine[] => {
    const result: DiffLine[] = []
    let originalIndex = 0
    let modifiedIndex = 0
    let originalLineNumber = 1
    let modifiedLineNumber = 1

    while (originalIndex < original.length || modifiedIndex < modified.length) {
      const originalItem = original[originalIndex] || ""
      const modifiedItem = modified[modifiedIndex] || ""

      if (originalIndex >= original.length) {
        // Only modified items left
        result.push({
          type: "added",
          originalContent: "",
          modifiedContent: modifiedItem,
          originalLineNumber: originalLineNumber,
          modifiedLineNumber: modifiedLineNumber,
        })
        modifiedIndex++
        if (comparisonType === "Lines") modifiedLineNumber++
      } else if (modifiedIndex >= modified.length) {
        // Only original items left
        result.push({
          type: "removed",
          originalContent: originalItem,
          modifiedContent: "",
          originalLineNumber: originalLineNumber,
          modifiedLineNumber: modifiedLineNumber,
        })
        originalIndex++
        if (comparisonType === "Lines") originalLineNumber++
      } else if (originalItem === modifiedItem) {
        // Items are the same
        result.push({
          type: "unchanged",
          originalContent: originalItem,
          modifiedContent: modifiedItem,
          originalLineNumber: originalLineNumber,
          modifiedLineNumber: modifiedLineNumber,
        })
        originalIndex++
        modifiedIndex++
        if (comparisonType === "Lines") {
          originalLineNumber++
          modifiedLineNumber++
        }
      } else {
        // Items are different
        result.push({
          type: "modified",
          originalContent: originalItem,
          modifiedContent: modifiedItem,
          originalLineNumber: originalLineNumber,
          modifiedLineNumber: modifiedLineNumber,
        })
        originalIndex++
        modifiedIndex++
        if (comparisonType === "Lines") {
          originalLineNumber++
          modifiedLineNumber++
        }
      }
    }

    return result
  }

  // Group diff lines into blocks
  const groupDiffBlocks = (diffLines: DiffLine[]): DiffBlock[] => {
    const blocks: DiffBlock[] = []
    let currentBlock: DiffBlock | null = null

    diffLines.forEach((line, index) => {
      const isChanged = line.type !== "unchanged"

      if (isChanged) {
        if (!currentBlock || currentBlock.type === "unchanged") {
          // Start a new changed block
          currentBlock = {
            type: "changed",
            lines: [line],
            startLine: line.originalLineNumber,
            endLine: line.originalLineNumber,
          }
          blocks.push(currentBlock)
        } else {
          // Continue the changed block
          currentBlock.lines.push(line)
          currentBlock.endLine = line.originalLineNumber
        }
      } else {
        if (!currentBlock || currentBlock.type === "changed") {
          // Start a new unchanged block
          currentBlock = {
            type: "unchanged",
            lines: [line],
            startLine: line.originalLineNumber,
            endLine: line.originalLineNumber,
          }
          blocks.push(currentBlock)
        } else {
          // Continue the unchanged block
          currentBlock.lines.push(line)
          currentBlock.endLine = line.originalLineNumber
        }
      }
    })

    return blocks
  }

  const diffResult = useMemo(() => {
    if (!originalSQL && !modifiedSQL) return []

    const originalParts = splitText(originalSQL, comparisonType)
    const modifiedParts = splitText(modifiedSQL, comparisonType)
    const diffLines = computeDiff(originalParts, modifiedParts)

    return groupDiffBlocks(diffLines)
  }, [originalSQL, modifiedSQL, comparisonType])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Copied to clipboard!")
    } catch (err) {
      console.error("Failed to copy:", err)
      alert("Failed to copy to clipboard")
    }
  }

  const renderDiffLine = (line: DiffLine, index: number) => {
    const getLineClass = () => {
      switch (line.type) {
        case "added":
          return styles.addedLine
        case "removed":
          return styles.removedLine
        case "modified":
          return styles.modifiedLine
        default:
          return styles.unchangedLine
      }
    }

    const renderLineContent = (content: string, type: "original" | "modified") => {
      if (!content && line.type === "unchanged") return null

      return (
        <div className={styles.lineContent}>
          <span className={styles.lineText}>{content || (line.type !== "unchanged" ? "(empty)" : "")}</span>
        </div>
      )
    }

    return (
      <div key={index} className={`${styles.diffLine} ${getLineClass()}`}>
        <div className={styles.lineNumbers}>
          <span className={styles.originalLineNumber}>{line.type !== "added" ? line.originalLineNumber : ""}</span>
          <span className={styles.modifiedLineNumber}>{line.type !== "removed" ? line.modifiedLineNumber : ""}</span>
        </div>

        <div className={styles.lineContentContainer}>
          {line.type === "modified" ? (
            <div className={styles.sideBySide}>
              <div className={styles.originalSide}>
                <span className={styles.diffPrefix}>-</span>
                {renderLineContent(line.originalContent, "original")}
              </div>
              <div className={styles.modifiedSide}>
                <span className={styles.diffPrefix}>+</span>
                {renderLineContent(line.modifiedContent, "modified")}
              </div>
            </div>
          ) : (
            <div className={styles.singleSide}>
              <span className={styles.diffPrefix}>
                {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
              </span>
              {renderLineContent(
                line.type === "removed" ? line.originalContent : line.modifiedContent,
                line.type === "removed" ? "original" : "modified",
              )}
            </div>
          )}
        </div>

        {line.type !== "unchanged" && (
          <button
            className={styles.copyButton}
            onClick={() => handleCopy(line.modifiedContent || line.originalContent)}
            title="Copy to clipboard"
          >
            📋
          </button>
        )}
      </div>
    )
  }

  const renderDiffBlock = (block: DiffBlock, blockIndex: number) => {
    if (block.type === "unchanged" && !showUnchanged) {
      const lineCount = block.lines.length
      if (lineCount <= 3) {
        return block.lines.map((line, index) => renderDiffLine(line, index))
      }

      return (
        <div key={`unchanged-${blockIndex}`} className={styles.unchangedCollapse}>
          <details className={styles.collapseDetails}>
            <summary className={styles.collapseSummary}>
              👁️ {lineCount} unchanged lines (lines {block.startLine}-{block.endLine})
            </summary>
            <div className={styles.collapseContent}>
              {block.lines.map((line, index) => renderDiffLine(line, index))}
            </div>
          </details>
        </div>
      )
    }

    return block.lines.map((line, index) => renderDiffLine(line, `${blockIndex}-${index}`))
  }

  const stats = useMemo(() => {
    const added = diffResult.reduce((acc, block) => acc + block.lines.filter((line) => line.type === "added").length, 0)
    const removed = diffResult.reduce(
      (acc, block) => acc + block.lines.filter((line) => line.type === "removed").length,
      0,
    )
    const modified = diffResult.reduce(
      (acc, block) => acc + block.lines.filter((line) => line.type === "modified").length,
      0,
    )

    return { added, removed, modified }
  }, [diffResult])

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>SQL Diff Highlighter</h1>
          <p className={styles.subtitle}>Compare SQL queries with Git-style diff visualization</p>
        </div>

        <div className={styles.inputSection}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Original SQL Query</label>
            <textarea
              value={originalSQL}
              onChange={(e) => setOriginalSQL(e.target.value)}
              placeholder="Paste your original SQL query here..."
              rows={10}
              className={styles.sqlInput}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Modified SQL Query</label>
            <textarea
              value={modifiedSQL}
              onChange={(e) => setModifiedSQL(e.target.value)}
              placeholder="Paste your modified SQL query here..."
              rows={10}
              className={styles.sqlInput}
            />
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Compare by:</label>
            <select
              value={comparisonType}
              onChange={(e) => setComparisonType(e.target.value as ComparisonType)}
              className={styles.comparisonSelect}
            >
              <option value="Lines">Lines</option>
              <option value="Words">Words</option>
              <option value="Characters">Characters</option>
            </select>
          </div>

          <button
            className={`${styles.toggleButton} ${showUnchanged ? styles.toggleButtonActive : ""}`}
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            {showUnchanged ? "👁️ Hide" : "👁️‍🗨️ Show"} Unchanged
          </button>
        </div>

        {(originalSQL || modifiedSQL) && (
          <>
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.addedStat}>+{stats.added} additions</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.removedStat}>-{stats.removed} deletions</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.modifiedStat}>~{stats.modified} modifications</span>
              </div>
            </div>

            <div className={styles.diffContainer}>
              <div className={styles.diffHeader}>
                <h3 className={styles.diffTitle}>Diff Results</h3>
                <button
                  className={styles.copyAllButton}
                  onClick={() => handleCopy(modifiedSQL)}
                  title="Copy modified query"
                >
                  📋 Copy Modified Query
                </button>
              </div>

              <div className={styles.diffContent}>
                {diffResult.map((block, index) => (
                  <div key={index} className={styles.diffBlock}>
                    {renderDiffBlock(block, index)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className={styles.legend}>
          <h4 className={styles.legendTitle}>Legend:</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <span className={styles.addedIndicator}></span>
              <span>Added</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.removedIndicator}></span>
              <span>Removed</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.modifiedIndicator}></span>
              <span>Modified</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.unchangedIndicator}></span>
              <span>Unchanged</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SQLDiffHighlighter
