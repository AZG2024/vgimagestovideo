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
var VideoRenderingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRenderingController = void 0;
const common_1 = require("@nestjs/common");
const video_rendering_service_1 = require("./video-rendering.service");
let VideoRenderingController = VideoRenderingController_1 = class VideoRenderingController {
    videoRenderingService;
    logger = new common_1.Logger(VideoRenderingController_1.name);
    constructor(videoRenderingService) {
        this.videoRenderingService = videoRenderingService;
    }
    async renderVideo(id) {
        this.videoRenderingService.renderVideo(id).catch((err) => {
            this.logger.error(`Background rendering failed for ${id}: ${err.message}`);
        });
        return { status: 'rendering', jobId: id };
    }
};
exports.VideoRenderingController = VideoRenderingController;
__decorate([
    (0, common_1.Post)(':id/render'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideoRenderingController.prototype, "renderVideo", null);
exports.VideoRenderingController = VideoRenderingController = VideoRenderingController_1 = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [video_rendering_service_1.VideoRenderingService])
], VideoRenderingController);
//# sourceMappingURL=video-rendering.controller.js.map