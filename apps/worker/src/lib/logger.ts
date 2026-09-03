import pino from "pino";

export const logger = pino({
  name: "swe-quant-worker",
  level: process.env.LOG_LEVEL ?? "info"
});

