"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";

type AiProvider = "gpt" | "claude" | "gemini";
type ConnectionStatus = "idle" | "checking" | "connected" | "failed";

const providerOptions: Array<{
  value: AiProvider;
  label: string;
  apiLabel: string;
  placeholder: string;
  storageKey: string;
}> = [
  {
    value: "gpt",
    label: "GPT",
    apiLabel: "OpenAI API 키",
    placeholder: "sk-...",
    storageKey: "gpt_api_key",
  },
  {
    value: "claude",
    label: "Claude",
    apiLabel: "Anthropic API 키",
    placeholder: "sk-ant-...",
    storageKey: "claude_api_key",
  },
  {
    value: "gemini",
    label: "Gemini",
    apiLabel: "Google AI Studio API 키",
    placeholder: "AIza...",
    storageKey: "gemini_api_key",
  },
];

const statusLabels: Record<ConnectionStatus, string> = {
  idle: "대기 중",
  checking: "확인 중",
  connected: "연결됨",
  failed: "오류",
};

const initialApiKeys: Record<AiProvider, string> = {
  gpt: "",
  claude: "",
  gemini: "",
};

function getProviderOption(provider: AiProvider) {
  return providerOptions.find((option) => option.value === provider) || providerOptions[0];
}

export default function DashboardPage() {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("gpt");
  const [apiKeys, setApiKeys] = useState<Record<AiProvider, string>>(initialApiKeys);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionMessage, setConnectionMessage] = useState("AI 제공자를 선택하고 API 키 연결을 확인하세요.");
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("전문적이고 친근하게");
  const [keyword, setKeyword] = useState("");
  const [outline, setOutline] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedOption = getProviderOption(selectedProvider);
  const apiKey = apiKeys[selectedProvider];

  const canGenerate = useMemo(
    () => connectionStatus === "connected" && title.trim() && audience.trim() && !loading,
    [audience, connectionStatus, loading, title],
  );

  useEffect(() => {
    const savedProvider = window.localStorage.getItem("selected_ai_provider") as AiProvider | null;
    const nextProvider: AiProvider =
      savedProvider && providerOptions.some((option) => option.value === savedProvider) ? savedProvider : "gpt";
    const nextApiKeys = providerOptions.reduce<Record<AiProvider, string>>(
      (keys, option) => ({
        ...keys,
        [option.value]:
          window.localStorage.getItem(option.storageKey) ||
          (option.value === "gpt" ? window.localStorage.getItem("openai_api_key") || "" : ""),
      }),
      initialApiKeys,
    );

    setSelectedProvider(nextProvider);
    setApiKeys(nextApiKeys);

    if (nextApiKeys[nextProvider]) {
      setConnectionStatus("idle");
      setConnectionMessage(`${getProviderOption(nextProvider).label} API 키가 저장되어 있습니다. 연결 확인을 눌러주세요.`);
    }
  }, []);

  function updateSelectedProvider(provider: AiProvider) {
    setSelectedProvider(provider);
    window.localStorage.setItem("selected_ai_provider", provider);
    setConnectionStatus("idle");
    setMessage("");

    const nextOption = getProviderOption(provider);
    const nextKey = apiKeys[provider];
    setConnectionMessage(
      nextKey
        ? `${nextOption.label} API 키가 저장되어 있습니다. 연결 확인을 눌러주세요.`
        : `${nextOption.label} API 키를 입력하고 연결을 확인하세요.`,
    );
  }

  function updateApiKey(value: string) {
    setApiKeys((current) => ({ ...current, [selectedProvider]: value }));
    setConnectionStatus("idle");
    setConnectionMessage("API 키가 변경되었습니다. 다시 연결 확인을 눌러주세요.");
  }

  async function checkAiConnection() {
    const trimmedApiKey = apiKey.trim();

    if (!trimmedApiKey) {
      setConnectionStatus("failed");
      setConnectionMessage(`${selectedOption.apiLabel}를 입력해주세요.`);
      return;
    }

    setConnectionStatus("checking");
    setConnectionMessage(`${selectedOption.label} 연결을 확인하는 중입니다...`);

    try {
      const response = await fetch("/api/check-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey: trimmedApiKey }),
      });

      const data = await response.json();

      if (response.ok) {
        window.localStorage.setItem(selectedOption.storageKey, trimmedApiKey);
        if (selectedProvider === "gpt") {
          window.localStorage.setItem("openai_api_key", trimmedApiKey);
        }
        setConnectionStatus("connected");
        setConnectionMessage(data.message || `${selectedOption.label} 연결을 확인했습니다.`);
      } else {
        setConnectionStatus("failed");
        setConnectionMessage(data.error || `${selectedOption.label} 연결 확인에 실패했습니다.`);
      }
    } catch {
      setConnectionStatus("failed");
      setConnectionMessage(`${selectedOption.label} 연결 확인 중 문제가 발생했습니다.`);
    }
  }

  async function handleGenerate() {
    if (connectionStatus !== "connected") {
      setMessage("전자책을 생성하기 전에 AI 연결 확인을 완료해주세요.");
      return;
    }

    if (!title.trim() || !audience.trim()) {
      setMessage("제목과 대상 독자는 반드시 입력해주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          title,
          audience,
          tone,
          keyword,
          apiKey: apiKey.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setOutline(data.outline);
        setContent(data.content);
        setMessage(`${selectedOption.label}로 전자책 초안을 생성했습니다.`);
      } else {
        setMessage(data.error || "생성 중 문제가 발생했습니다.");
      }
    } catch {
      setMessage("생성 요청 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title || "전자책 제목", 14, 20);
    doc.setFontSize(12);
    doc.text(`AI: ${selectedOption.label}`, 14, 30);
    doc.text(`대상: ${audience || "-"}`, 14, 36);
    doc.text(`톤: ${tone}`, 14, 42);
    doc.text("\n목차:", 14, 56);
    doc.text(outline || "목차가 없습니다.", 14, 64, { maxWidth: 180 });
    doc.text("\n내용:\n", 14, 86);
    doc.text(content || "내용이 없습니다.", 14, 94, { maxWidth: 180 });
    doc.save("ebook.pdf");
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <Link className="back-link" href="/">
            홈으로
          </Link>
          <h1>전자책 생성기</h1>
          <p>GPT, Claude, Gemini 중 사용할 AI를 선택하고 API 키 연결부터 초안 생성까지 진행하세요.</p>
        </div>
        <div className={`status-pill ${connectionStatus}`}>
          <span />
          {selectedOption.label} {statusLabels[connectionStatus]}
        </div>
      </header>

      <div className="workspace-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <p className="eyebrow">Step 1</p>
            <h2>AI 연결</h2>
          </div>

          <label htmlFor="ai-provider">AI 제공자</label>
          <select
            id="ai-provider"
            value={selectedProvider}
            onChange={(event) => updateSelectedProvider(event.target.value as AiProvider)}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="api-key">{selectedOption.apiLabel}</label>
          <div className="api-key-row">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(event) => updateApiKey(event.target.value)}
              placeholder={selectedOption.placeholder}
              autoComplete="off"
            />
            <button className="secondary-button" onClick={checkAiConnection} disabled={connectionStatus === "checking"}>
              {connectionStatus === "checking" ? "확인 중..." : "연결 확인"}
            </button>
          </div>
          <p className={`connection-status ${connectionStatus}`}>{connectionMessage}</p>

          <div className="divider" />

          <div className="panel-heading">
            <p className="eyebrow">Step 2</p>
            <h2>전자책 기획</h2>
          </div>
          <label htmlFor="title">제목</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 1인 창업자를 위한 생산성 전략"
          />
          <label htmlFor="audience">대상 독자</label>
          <input
            id="audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="예: 초기 창업자, 마케터, 프리랜서"
          />
          <label htmlFor="tone">문체</label>
          <input
            id="tone"
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            placeholder="예: 실용적이고 친근하게"
          />
          <label htmlFor="keyword">핵심 키워드</label>
          <input
            id="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: 자동화, 시간 관리, 콘텐츠 전략"
          />
          <button className="primary-button full-width" onClick={handleGenerate} disabled={!canGenerate}>
            {loading ? "초안 생성 중..." : `${selectedOption.label}로 초안 생성`}
          </button>
          {message && <p className="message">{message}</p>}
        </section>

        <section className="panel result-panel">
          <div className="panel-heading result-heading">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2>생성 결과</h2>
            </div>
            {outline && (
              <button className="secondary-button compact" onClick={downloadPdf}>
                PDF 저장
              </button>
            )}
          </div>

          {outline ? (
            <div className="result-stack">
              <article>
                <h3>목차</h3>
                <pre>{outline}</pre>
              </article>
              <article>
                <h3>본문 초안</h3>
                <pre>{content}</pre>
              </article>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">{selectedOption.label.slice(0, 2)}</div>
              <h3>아직 생성된 초안이 없습니다</h3>
              <p>왼쪽에서 AI 제공자와 API 키를 연결한 뒤 제목과 대상 독자를 입력하면 결과가 여기에 표시됩니다.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
