import { emailWorker } from "./emailWorker.js";
import { fraudWorker } from "./fraudWorker.js";
import logger from "../config/logger.js";

export {emailWorker, fraudWorker};

logger.info('All worker started')