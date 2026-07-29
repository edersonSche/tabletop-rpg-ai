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
    const model = this.selectModel(context);

    try {
      return await this.callModel(model, fullPrompt);
    } catch (error) {
      console.error(
        `OpenRouter model (${model}) error:`,
        error.message,
      );

      if (
        OpenRouterProvider.FALLBACK_MODEL &&
        OpenRouterProvider.FALLBACK_MODEL !== model
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

  private selectModel(context: AIContext): string {
    if (context.gamePhase === 'trade' && this.config.tradeModel) {
      return this.config.tradeModel;
    }
    return this.model;
  }

  private async callModel(model: string, prompt: string): Promise<AIResponse> {
    try {
      return await this.sendRequest(model, prompt, true);
    } catch (error) {
      if (this.isValidationError(error)) {
        console.warn(
          `Model ${model} does not support response_format — retrying without JSON mode`,
        );
        return await this.sendRequest(model, prompt, false);
      }
      throw error;
    }
  }

  private async sendRequest(
    model: string,
    prompt: string,
    useJsonFormat: boolean,
  ): Promise<AIResponse> {
    const chatRequest: any = {
      messages: [{ role: "system", content: prompt }],
      model,
      temperature: OpenRouterProvider.TEMPERATURE,
    };

    if (useJsonFormat) {
      chatRequest.response_format = { type: OpenRouterProvider.RESPONSE_FORMAT };
    }

    const result = await this.client.chat.send({ chatRequest });

    const text = this.extractText(result);
    return parseResponse(text);
  }

  private isValidationError(error: any): boolean {
    const msg = (error?.message || "").toLowerCase();
    return (
      msg.includes("validation") ||
      msg.includes("response_format") ||
      error?.status === 400
    );
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
      summary: context.summary || "The adventure continues.",
      next: {
        type: "group_action",
      },
    };
  }
}
