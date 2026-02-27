"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioGenerationModule = void 0;
const common_1 = require("@nestjs/common");
const audio_generation_controller_1 = require("./audio-generation.controller");
const audio_generation_service_1 = require("./audio-generation.service");
const jobs_module_1 = require("../jobs/jobs.module");
let AudioGenerationModule = class AudioGenerationModule {
};
exports.AudioGenerationModule = AudioGenerationModule;
exports.AudioGenerationModule = AudioGenerationModule = __decorate([
    (0, common_1.Module)({
        imports: [jobs_module_1.JobsModule],
        controllers: [audio_generation_controller_1.AudioGenerationController],
        providers: [audio_generation_service_1.AudioGenerationService],
        exports: [audio_generation_service_1.AudioGenerationService],
    })
], AudioGenerationModule);
//# sourceMappingURL=audio-generation.module.js.map