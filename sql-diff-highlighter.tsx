"use client"

import type React from "react"
import { useState, useMemo } from "react"
import styles from "./sql-diff-highlighter.module.css"

type SplitType = "Lines" | "Words" | "Characters"

interface DiffItem {
  value: string
  type: "unchanged" | "changed" | "added" | "removed"
  index: number
}

const SQLDiffHighlighter: React.FC = () => {
  const [query1, setQuery1] = useState<string>("")
  const [query2, setQuery2] = useState<string>("")
  const [splitType, setSplitType] = useState<SplitType>("Lines")

  // Split text based on selected type
  const splitText = (text: string, type: SplitType): string[] => {
    switch (type) {
      case "Lines":
        return text.split("\n")
      case "Words":
        return text.split(/\s+/).filter((word) => word.length > 0)
      case "Characters":
        return text.split("")
      default:
        return []
    }
  }

  // Generate diff comparison
  const diffResult = useMemo(() => {
    const parts1 = splitText(query1, splitType)
    const parts2 = splitText(query2, splitType)
    const maxLength = Math.max(parts1.length, parts2.length)

    const diff1: DiffItem[] = []
    const diff2: DiffItem[] = []

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || ""
      const part2 = parts2[i] || ""

      if (part1 === part2) {
        diff1.push({ value: part1, type: "unchanged", index: i })
        diff2.push({ value: part2, type: "unchanged", index: i })
      } else {
        if (part1) {
          diff1.push({
            value: part1,
            type: i >= parts2.length ? "removed" : "changed",
            index: i,
          })
        }
        if (part2) {
          diff2.push({
            value: part2,
            type: i >= parts1.length ? "added" : "changed",
            index: i,
          })
        }

        // Handle missing parts
        if (!part1 && part2) {
          diff1.push({ value: "", type: "removed", index: i })
        }
        if (!part2 && part1) {
          diff2.push({ value: "", type: "added", index: i })
        }
      }
    }

    return { diff1, diff2 }
  }, [query1, query2, splitType])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("Copied to clipboard!")
    } catch (err) {
      alert("Failed to copy to clipboard")
    }
  }

  const renderDiffItem = (item: DiffItem, side: "left" | "right") => {
    const getClassName = () => {
      switch (item.type) {
        case "changed":
          return styles.changed
        case "added":
          return styles.added
        case "removed":
          return styles.removed
        default:
          return styles.unchanged
      }
    }

    const getSeparator = () => {
      if (splitType === "Lines") return "\n"
      if (splitType === "Words") return " "
      return ""
    }

    return (
      <span key={`${side}-${item.index}`} className={getClassName()}>
        {item.value}
        {item.index < (side === "left" ? diffResult.diff1.length - 1 : diffResult.diff2.length - 1) && getSeparator()}
      </span>
    )
  }

  const renderDiffPanel = (diffItems: DiffItem[], title: string, originalQuery: string) => (
    <div className={styles.diffPanel}>
      <div className={styles.diffPanelHeader}>
        <h3 className={styles.diffPanelTitle}>{title}</h3>
        <button className={styles.copyButton} onClick={() => handleCopy(originalQuery)} title="Copy to clipboard">
          📋 Copy
        </button>
      </div>
      <div className={styles.diffContent}>
        <div className={styles.diffText}>
          {diffItems.map((item, index) => renderDiffItem(item, title.includes("Query 1") ? "left" : "right"))}
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <h1 className={styles.cardTitle}>SQL Diff Highlighter</h1>
        </div>

        <div className={styles.cardBody}>
          {/* Input Section */}
          <div className={styles.inputSection}>
            <div className={styles.inputGroup}>
              <div className={styles.inputCard}>
                <h3 className={styles.inputTitle}>Query 1</h3>
                <textarea
                  value={query1}
                  onChange={(e) => setQuery1(e.target.value)}
                  placeholder="Enter your first SQL query here..."
                  rows={8}
                  className={styles.textArea}
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <div className={styles.inputCard}>
                <h3 className={styles.inputTitle}>Query 2</h3>
                <textarea
                  value={query2}
                  onChange={(e) => setQuery2(e.target.value)}
                  placeholder="Enter your second SQL query here..."
                  rows={8}
                  className={styles.textArea}
                />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controlsSection}>
            <div className={styles.controls}>
              <label htmlFor="splitType" className={styles.controlLabel}>
                Split by:
              </label>
              <select
                id="splitType"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as SplitType)}
                className={styles.select}
              >
                <option value="Lines">Lines</option>
                <option value="Words">Words</option>
                <option value="Characters">Characters</option>
              </select>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Diff Results */}
          {(query1 || query2) && (
            <div className={styles.diffSection}>
              <div className={styles.diffGroup}>
                {renderDiffPanel(diffResult.diff1, "Query 1 - Comparison", query1)}
              </div>
              <div className={styles.diffGroup}>
                {renderDiffPanel(diffResult.diff2, "Query 2 - Comparison", query2)}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className={styles.legend}>
            <h3 className={styles.legendTitle}>Legend</h3>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={styles.unchanged}>Unchanged</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.changed}>Changed</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.added}>Added</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.removed}>Removed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SQLDiffHighlighter
