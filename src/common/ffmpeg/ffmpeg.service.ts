import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ffmpeg = require('fluent-ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegStatic: string = require('ffmpeg-static');
import * as path from 'path';

@Injectable()
export class FfmpegService implements OnModuleInit {
  private readonly logger = new Logger(FfmpegService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH') || ffmpegStatic;
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      this.logger.log(`FFmpeg path set to: ${ffmpegPath}`);
    } else {
      this.logger.log('Using FFmpeg from system PATH');
    }
  }

  /**
   * Renders final video: video1 → video2 → video3 with crossfade transitions,
   * optional voice-over and background music.
   *
   * Inputs layout:
   *   [0] video1, [1] video2, [2] video3, [3] voiceover (optional), [4] bgMusic (optional)
   */
  async renderFinalVideo(
    video1Path: string,
    video2Path: string,
    video3Path: string,
    outputPath: string,
    voiceoverPath?: string,
    bgMusicPath?: string,
    transitionDuration: number = 1,
    video1Duration: number = 5,
    video2Duration: number = 10,
  ): Promise<void> {
    // First crossfade starts at end of video1
    const offset1 = video1Duration - transitionDuration;
    // Second crossfade: total after first xfade minus transition
    const offset2 = (video1Duration + video2Duration - transitionDuration) - transitionDuration;

    this.logger.log(
      `Rendering: 3 clips → ${path.basename(outputPath)} (crossfade ${transitionDuration}s, offsets: ${offset1}s/${offset2}s, voice: ${voiceoverPath ? 'yes' : 'no'}, music: ${bgMusicPath ? 'yes' : 'no'})`,
    );

    return new Promise((resolve, reject) => {
      const cmd = ffmpeg()
        .input(video1Path)
        .input(video2Path)
        .input(video3Path);

      // Track input indices (after 3 video inputs)
      let nextIndex = 3;
      const voiceIndex = voiceoverPath ? nextIndex++ : -1;
      const musicIndex = bgMusicPath ? nextIndex++ : -1;

      if (voiceoverPath) cmd.input(voiceoverPath);
      if (bgMusicPath) cmd.input(bgMusicPath);

      // Build complex filter: 2 chained crossfades
      const filters: string[] = [
        `[0:v][1:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset1}[v01]`,
        `[v01][2:v]xfade=transition=fade:duration=${transitionDuration}:offset=${offset2},format=yuv420p[v]`,
      ];

      const hasVoice = voiceoverPath && voiceIndex >= 0;
      const hasMusic = bgMusicPath && musicIndex >= 0;

      if (hasVoice && hasMusic) {
        // Mix voice (full volume) + music (~30% volume)
        filters.push(`[${musicIndex}:a]volume=0.30[bglow]`);
        filters.push(`[${voiceIndex}:a][bglow]amix=inputs=2:duration=longest[a]`);
      } else if (hasVoice) {
        filters.push(`[${voiceIndex}:a]acopy[a]`);
      } else if (hasMusic) {
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
        .on('start', (cmdStr: string) => {
          this.logger.log(`FFmpeg command: ${cmdStr}`);
        })
        .on('progress', (progress: { percent?: number }) => {
          if (progress.percent) {
            this.logger.log(`Rendering progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          this.logger.log('Rendering complete');
          resolve();
        })
        .on('error', (err: Error) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          reject(new Error(`FFmpeg rendering failed: ${err.message}`));
        })
        .run();
    });
  }
}
