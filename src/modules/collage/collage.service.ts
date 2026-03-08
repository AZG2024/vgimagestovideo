import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { GeminiService } from '../../common/gemini/gemini.service';
import { SupabaseService } from '../../common/supabase/supabase.service';

const COLLAGE_PROMPT_TEMPLATE = `Create a minimalist luxury jewelry moodboard collage using the {N} provided product images.

Important:
Do NOT simply place the original images in the collage. 
Extract the jewelry products from the images and recreate new compositions for them.

Product rules:
- Keep the jewelry exactly the same (shape, color, quality, details).
- Maintain high resolution and realistic texture.
- Do not distort or redesign the products.

Background style:
Place each product on minimalist natural backgrounds with white stones.
Use smooth white rocks, marble stones, or soft mineral textures.
The style should feel natural, calm, and elegant, similar to a luxury jewelry photoshoot.

Lighting:
Soft natural studio lighting
Subtle shadows
Clean editorial photography style

Layout:
Editorial fashion collage layout.
One large hero image on the right.
Two smaller square images stacked on the left.
Three square images aligned at the bottom.
Thin elegant borders around each image.
Balanced spacing.

Typography:
At the bottom center add large elegant text with the category name: "NECKLACES".

Text style:
Large serif uppercase letters with wide spacing.
A thin handwritten cursive script overlapping the word.
Luxury fashion editorial typography.

Overall aesthetic:
Minimalist luxury jewelry brand moodboard.
Neutral palette (white, beige, stone tones).
Very clean, modern, and elegant.`;

const PROMOTION_PROMPT_TEMPLATE = `Create a luxury jewelry promotional image using the provided product.

Product rules:
Keep the product exactly the same (shape, color, reflections and details).
Do not redesign the product.
Place the product naturally on a pedestal or platform made of white stone.

Background and environment:
Use a minimalist luxury background made of white stone, marble, or mineral textures similar to carved limestone.
The base and background should look like sculpted white rock with organic texture.
The product should rest on a stone platform made of the same material.

Lighting:
Soft natural sunlight coming from the side.
Beautiful soft shadows.
Warm elegant editorial lighting like a luxury jewelry photoshoot.

Style:
Minimalist luxury aesthetic.
Neutral palette (white, ivory, light beige).
High-end jewelry brand photography.
Clean, calm, and elegant composition.

Typography:
Add elegant vertical text on the left side that says:
"UP TO {DISCOUNT}% OFF"

Typography style:
Luxury serif font with wide spacing.
Brown or dark beige color.
Minimalist editorial design.
Small decorative star or diamond shapes can be included.

Composition:
Product centered on the stone base.
Elegant oval or arched frame around the scene.
Minimal luxury fashion brand layout.

High-end jewelry advertising style.
Very clean, modern, minimal, luxury brand visual.
Square format 1:1, high resolution.`;

@Injectable()
export class CollageService {
  private readonly logger = new Logger(CollageService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async generateCollage(
    files: Express.Multer.File[],
    categoryName: string,
  ): Promise<string> {
    const startTime = Date.now();

    const images = files.map((f) => ({
      buffer: f.buffer,
      mimeType: f.mimetype,
    }));

    const prompt = COLLAGE_PROMPT_TEMPLATE
      .replace('{N}', String(images.length))
      .replace('{CATEGORY_NAME}', categoryName.toUpperCase());

    this.logger.log(
      `Generating collage: ${images.length} images, category="${categoryName}"`,
    );

    const collageBuffer = await this.geminiService.generateCollageFromImages(
      images,
      prompt,
    );

    // Upload to Supabase
    const bucket = this.configService.get<string>('STORAGE_BUCKET')!;
    const path = `collages/${randomUUID()}.png`;

    const { error } = await this.supabaseService
      .getClient()
      .storage.from(bucket)
      .upload(path, collageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload collage: ${error.message}`);
    }

    const { data } = this.supabaseService
      .getClient()
      .storage.from(bucket)
      .getPublicUrl(path);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Collage generated in ${durationMs}ms: ${data.publicUrl}`,
    );

    return data.publicUrl;
  }

  async generatePromotion(
    file: Express.Multer.File,
    discount: number,
  ): Promise<string> {
    const startTime = Date.now();

    const images = [{ buffer: file.buffer, mimeType: file.mimetype }];
    const prompt = PROMOTION_PROMPT_TEMPLATE.replace('{DISCOUNT}', String(discount));

    this.logger.log(`Generating promotion: discount=${discount}%`);

    const promotionBuffer = await this.geminiService.generateCollageFromImages(
      images,
      prompt,
    );

    const bucket = this.configService.get<string>('STORAGE_BUCKET')!;
    const path = `promotions/${randomUUID()}.png`;

    const { error } = await this.supabaseService
      .getClient()
      .storage.from(bucket)
      .upload(path, promotionBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload promotion: ${error.message}`);
    }

    const { data } = this.supabaseService
      .getClient()
      .storage.from(bucket)
      .getPublicUrl(path);

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Promotion generated in ${durationMs}ms: ${data.publicUrl}`,
    );

    return data.publicUrl;
  }
}
