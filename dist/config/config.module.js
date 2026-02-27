"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigModule = void 0;
const config_1 = require("@nestjs/config");
const env_validation_1 = require("./env.validation");
exports.AppConfigModule = config_1.ConfigModule.forRoot({
    isGlobal: true,
    validate: env_validation_1.validate,
});
//# sourceMappingURL=config.module.js.map