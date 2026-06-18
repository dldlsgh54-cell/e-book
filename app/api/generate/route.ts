import OpenAI from "openai";
import { NextResponse } from "next/server";

type AiProvider = "gpt" | "claude" | "gemini";

type ClaudeResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

const providerLabels: Record<AiProvider, string> = {
  gpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
};

function isAiProvider(provider: unknown): provider is AiProvider {
  return provider === "gpt" || provider === "claude" || provider === "gemini";
}

function getProviderApiKey(provider: AiProvider, apiKey: unknown) {
  if (typeof apiKey === "string" && apiKey.trim()) {
    return apiKey.trim();
  }

  if (provider === "gpt") {
    return process.env.OPENAI_API_KEY;
  }

  if (provider === "claude") {
    return process.env.ANTHROPIC_API_KEY;
  }

  return process.env.GEMINI_API_KEY;
}

function buildPrompt(title: string, audience: string, tone: string, keyword: string) {
  return `전자책 제목: ${title}
대상 독자: ${audience}
문체: ${tone}
핵심 키워드: ${keyword}

아래 형식으로 한국어 전자책 초안을 작성해주세요.

목차:
- 6개 장으로 구성
- 각 장마다 2~3개의 주요 소제목 포함

본문 초안:
- 각 장의 핵심 내용을 실용적인 요약 콘텐츠로 작성
- 대상 독자가 바로 실행할 수 있는 조언 포함`;
}

function splitGeneratedText(text: string) {
  const outlineMatch = text.match(/목차[:：]?([\s\S]*?)(?:본문 초안[:：]?|$)/);
  const contentMatch = text.match(/본문 초안[:：]?([\s\S]*)/);

  if (outlineMatch || contentMatch) {
    return {
      outline: outlineMatch?.[1]?.trim() || text.trim(),
      content: contentMatch?.[1]?.trim() || "",
    };
  }

  const [outline, ...rest] = text.split("\n\n");
  return {
    outline: outline || text,
    content: rest.join("\n\n"),
  };
}

async function generateWithGpt(apiKey: string, prompt: string) {
  const openai = new OpenAI({ apiKey });
  const aiResponse = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: prompt,
    max_output_tokens: 1200,
  });

  return aiResponse.output_text || "";
}

async function generateWithClaude(apiKey: string, prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = (await response.json()) as ClaudeResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "Claude generation failed");
  }

  return data.content?.map((block) => (block.type === "text" ? block.text || "" : "")).join("\n") || "";
}

async function generateWithGemini(apiKey: string, prompt: string) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  const data = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini generation failed");
  }

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
}

export async function POST(request: Request) {
  try {
    const { provider = "gpt", title, audience, tone, keyword, apiKey } = await request.json();

    if (!isAiProvider(provider)) {
      return NextResponse.json({ error: "지원하지 않는 AI 제공자입니다." }, { status: 400 });
    }

    if (!title || !audience) {
      return NextResponse.json({ error: "제목과 대상 독자를 입력해주세요." }, { status: 400 });
    }

    const selectedApiKey = getProviderApiKey(provider, apiKey);

    if (!selectedApiKey) {
      return NextResponse.json({ error: `${providerLabels[provider]} API 키 연결 확인이 필요합니다.` }, { status: 400 });
    }

    const prompt = buildPrompt(title, audience, tone || "전문적이고 친근하게", keyword || "");
    const text =
      provider === "gpt"
        ? await generateWithGpt(selectedApiKey, prompt)
        : provider === "claude"
          ? await generateWithClaude(selectedApiKey, prompt)
          : await generateWithGemini(selectedApiKey, prompt);

    const { outline, content } = splitGeneratedText(text);

    return NextResponse.json({ outline, content });
  } catch {
    return NextResponse.json(
      { error: "AI 생성에 실패했습니다. API 키, 모델 접근 권한, 사용 한도를 확인해주세요." },
      { status: 500 },
    );
  }
}
