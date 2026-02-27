import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ELEVEN_LABS_API_KEY')!;
  }

  async textToSpeech(
    text: string,
    voiceId: string = '21m00Tcm4TlvDq8ikWAM', // Rachel - female voice
  ): Promise<Buffer> {
    this.logger.log(
      `Generating TTS audio (${text.split(' ').length} words, voice: ${voiceId})...`,
    );

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            speed: 0.75,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs TTS failed (${response.status}): ${errorText}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    this.logger.log(
      `TTS audio generated: ${(buffer.length / 1024).toFixed(1)}KB`,
    );

    return buffer;
  }
}
