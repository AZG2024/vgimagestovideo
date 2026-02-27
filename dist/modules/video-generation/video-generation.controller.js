"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var VideoGenerationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoGenerationController = void 0;
const common_1 = require("@nestjs/common");
const video_generation_service_1 = require("./video-generation.service");
let VideoGenerationController = VideoGenerationController_1 = class VideoGenerationController {
    videoGenerationService;
    logger = new common_1.Logger(VideoGenerationController_1.name);
    constructor(videoGenerationService) {
        this.videoGenerationService = videoGenerationService;
    }
    async generateVideos(id) {
        this.videoGenerationService.generateVideos(id).catch((err) => {
            this.logger.error(`Background video generation failed for ${id}: ${err.message}`);
        });
        return { status: 'processing', jobId: id };
    }
};
exports.VideoGenerationController = VideoGenerationController;
__decorate([
    (0, common_1.Post)(':id/generate-videos'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideoGenerationController.prototype, "generateVideos", null);
exports.VideoGenerationController = VideoGenerationController = VideoGenerationController_1 = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [video_generation_service_1.VideoGenerationService])
], VideoGenerationController);
//# sourceMappingURL=video-generation.controller.js.map