"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FfmpegService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FfmpegService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ffmpeg = require("fluent-ffmpeg");
const path = __importStar(require("path"));
let FfmpegService = FfmpegService_1 = class FfmpegService {
    configService;
    logger = new common_1.Logger(FfmpegService_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const ffmpegPath = this.configService.get('FFMPEG_PATH');
        if (ffmpegPath) {
            ffmpeg.setFfmpegPath(ffmpegPath);
            this.logger.log(`FFmpeg path set to: ${ffmpegPath}`);
        }
        else {
            this.logger.log('Using FFmpeg from system PATH');
        }
    }
    async renderFinalVideo(video1Path, video2Path, video3Path, outputPath, voiceoverPath, bgMusicPath, transitionDuration = 1, video1Duration = 5, video2Duration = 10) {
        const offset1 = video1Duration - transitionDuration;
        const offset2 = (video1Duration + video2Duration - transitionDuration) - transitionDuration;
        this.logger.log(`Rendering: 3 clips → ${path.basename(outputPath)} (crossfade ${transitionDuration}s, offsets: ${offset1}s/${offset2}s, voice: ${voiceoverPath ? 'yes' : 'no'}, music: ${bgMusicPath ? 'yes' : 'no'})`);
        return new Promise((resolve, reject) => {
            const cmd = ffmpeg()
                .input(video1Path)
                .input(video2Path)
                .input(video3Path);
            let nextIndex = 3;
            const voiceIndex = voiceoverPath ? nextIndex++ : -1;
            const musicIndex = bgMusicPath ? nextIndex++ : -1;
            if (voiceoverPath)
                cmd.input(voiceoverPath);
            if (bgMusicPath)
                cmd.input(bgMusicPath);
            const filters = [
                `[0:v][1:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset1}[v01]`,
                `[v01][2:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset2},format=yuv420p[v]`,
            ];
            const hasVoice = voiceoverPath && voiceIndex >= 0;
            const hasMusic = bgMusicPath && musicIndex >= 0;
            if (hasVoice && hasMusic) {
                filters.push(`[${musicIndex}:a]volume=0.30[bglow]`);
                filters.push(`[${voiceIndex}:a][bglow]amix=inputs=2:duration=longest[a]`);
            }
            else if (hasVoice) {
                filters.push(`[${voiceIndex}:a]acopy[a]`);
            }
            else if (hasMusic) {
                filters.push(`[${musicIndex}:a]volume=0.5[a]`);
            }
            const hasAnyAudio = hasVoice || hasMusic;
            const outputOpts = [
                '-map', '[v]',
                ...(hasAnyAudio ? ['-map', '[a]'] : []),
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-movflags', '+faststart',
                ...(hasAnyAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
            ];
            cmd.complexFilter(filters)
                .outputOptions(outputOpts)
                .output(outputPath)
                .on('start', (cmdStr) => {
                this.logger.log(`FFmpeg command: ${cmdStr}`);
            })
                .on('progress', (progress) => {
                if (progress.percent) {
                    this.logger.log(`Rendering progress: ${Math.round(progress.percent)}%`);
                }
            })
                .on('end', () => {
                this.logger.log('Rendering complete');
                resolve();
            })
                .on('error', (err) => {
                this.logger.error(`FFmpeg error: ${err.message}`);
                reject(new Error(`FFmpeg rendering failed: ${err.message}`));
            })
                .run();
        });
    }
};
exports.FfmpegService = FfmpegService;
exports.FfmpegService = FfmpegService = FfmpegService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FfmpegService);
//# sourceMappingURL=ffmpeg.service.js.map