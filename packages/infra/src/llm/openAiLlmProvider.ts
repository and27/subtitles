import type { LlmHintRequest, LlmHintResponse, LlmProviderPort } from "core";

type OpenAiLlmConfig = {
  apiKey: string;
  model: string;
  baseUrl?: string;
};

export class OpenAiLlmProvider implements LlmProviderPort {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: OpenAiLlmConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  }

  async generateHints(request: LlmHintRequest): Promise<LlmHintResponse> {
    const prompt =
      request.mode === "direct"
        ? [
            "You are a concise interview coach.",
            "Return a direct answer, not hints.",
            "Max 7 lines total.",
            "Use the same language as the question.",
            "Format exactly:",
            "Answer: <short answer>",
          ].join("\n")
        : [
            "You are a concise interview coach.",
            "Return a short summary and 1-3 bullet hints.",
            "Max 7 lines total.",
            "Use the same language as the question.",
            "Format exactly:",
            "Summary: <one short line>",
            "- bullet 1 (eg.)",
            "- bullet 2 (eg.)",
            "- bullet 3 (optional)",
          ].join("\n");

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 160,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: request.question },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return { text: typeof content === "string" ? content.trim() : "" };
  }
}
