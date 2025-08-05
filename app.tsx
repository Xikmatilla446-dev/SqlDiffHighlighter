import type React from "react"
import { ConfigProvider } from "antd"
import SQLDiffHighlighter from "./sql-diff-highlighter"

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#667eea",
          borderRadius: 6,
        },
      }}
    >
      <SQLDiffHighlighter />
    </ConfigProvider>
  )
}

export default App
