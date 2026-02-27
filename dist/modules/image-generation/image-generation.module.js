"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationModule = void 0;
const common_1 = require("@nestjs/common");
const image_generation_service_1 = require("./image-generation.service");
const image_generation_controller_1 = require("./image-generation.controller");
const jobs_module_1 = require("../jobs/jobs.module");
let ImageGenerationModule = class ImageGenerationModule {
};
exports.ImageGenerationModule = ImageGenerationModule;
exports.ImageGenerationModule = ImageGenerationModule = __decorate([
    (0, common_1.Module)({
        imports: [jobs_module_1.JobsModule],
        controllers: [image_generation_controller_1.ImageGenerationController],
        providers: [image_generation_service_1.ImageGenerationService],
        exports: [image_generation_service_1.ImageGenerationService],
    })
], ImageGenerationModule);
//# sourceMappingURL=image-generation.module.js.map