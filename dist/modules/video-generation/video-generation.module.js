"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoGenerationModule = void 0;
const common_1 = require("@nestjs/common");
const video_generation_service_1 = require("./video-generation.service");
const video_generation_controller_1 = require("./video-generation.controller");
const jobs_module_1 = require("../jobs/jobs.module");
let VideoGenerationModule = class VideoGenerationModule {
};
exports.VideoGenerationModule = VideoGenerationModule;
exports.VideoGenerationModule = VideoGenerationModule = __decorate([
    (0, common_1.Module)({
        imports: [jobs_module_1.JobsModule],
        controllers: [video_generation_controller_1.VideoGenerationController],
        providers: [video_generation_service_1.VideoGenerationService],
        exports: [video_generation_service_1.VideoGenerationService],
    })
], VideoGenerationModule);
//# sourceMappingURL=video-generation.module.js.map