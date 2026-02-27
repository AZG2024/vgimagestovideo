"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const config_module_1 = require("./config/config.module");
const supabase_module_1 = require("./common/supabase/supabase.module");
const health_module_1 = require("./modules/health/health.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const upload_module_1 = require("./modules/upload/upload.module");
const gemini_module_1 = require("./common/gemini/gemini.module");
const image_generation_module_1 = require("./modules/image-generation/image-generation.module");
const wavespeed_module_1 = require("./common/wavespeed/wavespeed.module");
const video_generation_module_1 = require("./modules/video-generation/video-generation.module");
const ffmpeg_module_1 = require("./common/ffmpeg/ffmpeg.module");
const openai_module_1 = require("./common/openai/openai.module");
const elevenlabs_module_1 = require("./common/elevenlabs/elevenlabs.module");
const video_rendering_module_1 = require("./modules/video-rendering/video-rendering.module");
const audio_generation_module_1 = require("./modules/audio-generation/audio-generation.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'public'),
            }),
            config_module_1.AppConfigModule,
            supabase_module_1.SupabaseModule,
            gemini_module_1.GeminiModule,
            wavespeed_module_1.WaveSpeedModule,
            ffmpeg_module_1.FfmpegModule,
            openai_module_1.OpenaiModule,
            elevenlabs_module_1.ElevenLabsModule,
            health_module_1.HealthModule,
            jobs_module_1.JobsModule,
            upload_module_1.UploadModule,
            image_generation_module_1.ImageGenerationModule,
            video_generation_module_1.VideoGenerationModule,
            video_rendering_module_1.VideoRenderingModule,
            audio_generation_module_1.AudioGenerationModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map