import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { AIProvider, AIConfig, AIContext } from "../ai.interface";
import { AIResponse } from "../../dto/ai-response.dto";
import { buildFullPrompt, parseResponse } from "../shared/prompt-builder";

@Injectable()
export class OpenRouterProvider implements AIProvider, OnModuleInit {
  private static readonly TEMPERATURE = 0.7;
  private static readonly RESPONSE_FORMAT = "json_object" as const;
  private static readonly FALLBACK_MODEL = "openrouter/free";

  private client: any = null;
  private model: string = "";

  constructor(@Inject("AI_CONFIG") private config: AIConfig) {}

  async onModuleInit(): Promise<void> {
    this.validateConfig(this.config);

    const { OpenRouter } = await import("@openrouter/sdk");
    this.client = new OpenRouter({
      apiKey: this.config.apiKey,
      serverURL: this.config.baseUrl || "https://openrouter.ai/api/v1",
    });
    this.model = this.config.model;
  }

  validateConfig(config: AIConfig): void {
    if (!config.apiKey) {
      throw new Error("AI_API_KEY is required for OpenRouter provider");
    }
    if (!config.model) {
      throw new Error("AI_MODEL is required for OpenRouter provider");
    }
    if (!config.baseUrl) {
      throw new Error("AI_BASE_URL is required for OpenRouter provider");
    }
  }

  async generate(context: AIContext): Promise<AIResponse> {
    const fullPrompt = buildFullPrompt(context);

    try {
      return await this.callModel(this.model, fullPrompt);
    } catch (error) {
      console.error(
        `OpenRouter primary model (${this.model}) error:`,
        error.message,
      );

      if (
        OpenRouterProvider.FALLBACK_MODEL &&
        OpenRouterProvider.FALLBACK_MODEL !== this.model
      ) {
        console.log(
          `OpenRouter: falling back to ${OpenRouterProvider.FALLBACK_MODEL}`,
        );
        try {
          return await this.callModel(
            OpenRouterProvider.FALLBACK_MODEL,
            fullPrompt,
          );
        } catch (fallbackError) {
          console.error(
            `OpenRouter fallback model (${OpenRouterProvider.FALLBACK_MODEL}) error:`,
            fallbackError.message,
          );
        }
      }

      return this.fallbackResponse(context);
    }
  }

  private async callModel(model: string, prompt: string): Promise<AIResponse> {
    const chatRequest: any = {
      messages: [{ role: "system", content: prompt }],
      model,
      temperature: OpenRouterProvider.TEMPERATURE,
      response_format: { type: OpenRouterProvider.RESPONSE_FORMAT },
    };

    const result = await this.client.chat.send({ chatRequest });

    const text = this.extractText(result);
    return parseResponse(text);
  }

  async summarize(
    entries: string[],
    existingSummary?: string,
  ): Promise<string> {
    const promptLines: string[] = [];

    if (existingSummary) {
      promptLines.push(`Existing campaign summary:\n${existingSummary}\n`);
      promptLines.push(
        "Below are new events that happened after that summary. Please produce an updated, merged narrative summary that incorporates both the existing summary and these new events. Keep it concise but capture key plot points, character developments, locations, NPCs, and important decisions.",
      );
    } else {
      promptLines.push(
        "Summarize the following RPG campaign history concisely in narrative prose, capturing key plot points, character developments, locations visited, NPCs encountered, and important decisions made by the players.",
      );
    }

    promptLines.push("");
    promptLines.push(...entries);
    promptLines.push("");
    promptLines.push(
      "Return only the updated summary as plain text, no JSON, no formatting.",
    );

    const prompt = promptLines.join("\n");

    try {
      const result = await this.client.chat.send({
        chatRequest: {
          messages: [{ role: "system", content: prompt }],
          model: this.model,
          temperature: 0.5,
        },
      });

      const text = this.extractText(result);
      return text.trim();
    } catch (error) {
      console.error("OpenRouter summarize error:", error.message);
      throw error;
    }
  }

  private extractText(result: any): string {
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter((p: any) => p.type === "text" && p.text)
        .map((p: any) => p.text)
        .join("");
    }
    return "";
  }

  private fallbackResponse(context: AIContext): AIResponse {
    return {
      narration: `The adventure continues... ${context.currentAction?.action || "The group awaits the next move."}`,
      next: {
        type: "group_action",
      },
    };
  }
}
