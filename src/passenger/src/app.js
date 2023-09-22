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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const passport_1 = __importDefault(require("passport"));
const morgan_1 = require("building-blocks/logging/morgan");
const swaggerUi = __importStar(require("swagger-ui-express"));
const logger_1 = __importDefault(require("building-blocks/logging/logger"));
const logger_2 = __importDefault(require("building-blocks/logging/logger"));
const config_1 = __importDefault(require("building-blocks/config/config"));
const errorHandler_1 = require("building-blocks/middlewares/errorHandler");
const dataSource_1 = require("./data/dataSource");
const mediatrExtensions_1 = require("./extensions/mediatrExtensions");
const rabbitmqExtensions_1 = require("./extensions/rabbitmqExtensions");
const routes_1 = require("./routes/routes");
const otelExtensions_1 = require("./extensions/otelExtensions");
const monitoringExtensions_1 = require("./extensions/monitoringExtensions");
const prom_client_1 = require("prom-client");
(0, prom_client_1.collectDefaultMetrics)();
const app = (0, express_1.default)();
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    // request and response logging
    if (config_1.default.env !== 'test') {
        app.use(morgan_1.morganMiddleware);
    }
    // register monitoring
    yield (0, monitoringExtensions_1.initialMonitoring)(app);
    // establish database connection
    yield (0, dataSource_1.initialDataSource)();
    // set security HTTP headers
    app.use((0, helmet_1.default)());
    // parse json request body
    app.use(express_1.default.json());
    // parse urlencoded request body
    app.use(express_1.default.urlencoded({ extended: true }));
    // gzip compression
    app.use((0, compression_1.default)());
    // enable cors
    app.use((0, cors_1.default)());
    app.options('*', (0, cors_1.default)());
    // register openTelemetry
    yield (0, otelExtensions_1.initialOtel)();
    // metrics middleware
    // app.use(requestCounterMiddleware);
    // app.use(requestLatencyMiddleware);
    // jwt authentication
    app.use(passport_1.default.initialize());
    // register routes with tsoa
    (0, routes_1.RegisterRoutes)(app);
    // error handler
    app.use(errorHandler_1.errorHandler);
    //register swagger
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const swaggerDocument = require('./docs/swagger.json');
        app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
    catch (err) {
        logger_1.default.error('Unable to read swagger.json', err);
    }
    // run the server
    app.listen(config_1.default.port, () => {
        logger_2.default.info(`Listening to port ${config_1.default.port}`);
    });
    // register rabbitmq
    const rabbitmq = yield (0, rabbitmqExtensions_1.initialRabbitmq)();
    // register mediatr handlers
    yield (0, mediatrExtensions_1.registerMediatrHandlers)();
    // gracefully shut down on process exit
    process.on('SIGTERM', () => {
        rabbitmq.closeConnection();
        dataSource_1.dataSource.destroy();
    });
});
start();
exports.default = app;
//# sourceMappingURL=app.js.map