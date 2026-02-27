"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoRenderingModule = void 0;
const common_1 = require("@nestjs/common");
const video_rendering_service_1 = require("./video-rendering.service");
const video_rendering_controller_1 = require("./video-rendering.controller");
const jobs_module_1 = require("../jobs/jobs.module");
let VideoRenderingModule = class VideoRenderingModule {
};
exports.VideoRenderingModule = VideoRenderingModule;
exports.VideoRenderingModule = VideoRenderingModule = __decorate([
    (0, common_1.Module)({
        imports: [jobs_module_1.JobsModule],
        controllers: [video_rendering_controller_1.VideoRenderingController],
        providers: [video_rendering_service_1.VideoRenderingService],
        exports: [video_rendering_service_1.VideoRenderingService],
    })
], VideoRenderingModule);
//# sourceMappingURL=video-rendering.module.js.map