import OpenAI from "openai";
import { NextResponse } from "next/server";

type AiProvider = "gpt" | "claude" | "gemini";

const providerLabels: Record<AiProvider, string> = {
  gpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
};

function isAiProvider(provider: unknown): provider is AiProvider {
  return provider === "gpt" || provider === "claude" || provider === "gemini";
}

async function checkGptConnection(apiKey: string) {
  const openai = new OpenAI({ apiKey });
  await openai.models.retrieve(process.env.OPENAI_MODEL || "gpt-4.1-mini");
}

async function checkClaudeConnection(apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error("Claude connection failed");
  }
}

async function checkGeminiConnection(apiKey: string) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error("Gemini connection failed");
  }
}

export async function POST(request: Request) {
  try {
    const { provider = "gpt", apiKey } = await request.json();

    if (!isAiProvider(provider)) {
      return NextResponse.json({ error: "지원하지 않는 AI 제공자입니다." }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: `${providerLabels[provider]} API 키를 입력해주세요.` }, { status: 400 });
    }

    if (provider === "gpt") {
      await checkGptConnection(apiKey);
    }

    if (provider === "claude") {
      await checkClaudeConnection(apiKey);
    }

    if (provider === "gemini") {
      await checkGeminiConnection(apiKey);
    }

    return NextResponse.json({ message: `${providerLabels[provider]} 연결을 확인했습니다.` });
  } catch {
    return NextResponse.json(
      { error: "AI 연결 확인에 실패했습니다. API 키와 권한을 다시 확인해주세요." },
      { status: 401 },
    );
  }
}
