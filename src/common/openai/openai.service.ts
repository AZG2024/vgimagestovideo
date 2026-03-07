import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateProductDescription(
    category: string,
    stoneName: string,
  ): Promise<string> {
    const productType =
      category === 'necklace'
        ? 'necklace'
        : category === 'bracelet'
          ? 'bracelet'
          : 'home decoration piece';

    const prompt = `You are a luxury crystal jewelry copywriter.

Write one single sentence (28–30 words) describing the spiritual and emotional benefits of ${stoneName}.

CRITICAL: You MUST use the exact stone name "${stoneName}" in your sentence. Do NOT replace it with a different stone name or synonym.

Style rules:
- Elegant and refined tone
- Start with: "${stoneName} is known as..."
- No emojis
- No hashtags
- No exaggerated medical claims
- Keep it mystical but sophisticated
- One sentence only`;

    this.logger.log(
      `Generating description for ${category} with ${stoneName}...`,
    );

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0.8,
    });

    const description = response.choices[0]?.message?.content?.trim();

    if (!description) {
      throw new Error('OpenAI returned empty description');
    }

    this.logger.log(
      `Description generated (${description.split(' ').length} words): ${description.substring(0, 80)}...`,
    );

    return description;
  }
}
