import pino from "pino";

export const logger = pino({
  name: "faang-quant-worker",
  level: process.env.LOG_LEVEL ?? "info"
});

