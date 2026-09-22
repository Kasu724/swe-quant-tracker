const http = require("node:http");

function withTimeout(operation, timeoutMs, timeoutMessage) {
  let timer;
  const operationPromise = Promise.resolve().then(operation);
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([operationPromise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

function probeHttp(origin, timeoutMs = 1_000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (healthy) => {
      if (settled) return;
      settled = true;
      resolve(healthy);
    };

    const request = http.get(origin, (response) => {
      response.resume();
      finish(response.statusCode >= 200 && response.statusCode < 400);
    });
    request.setTimeout(timeoutMs, () => request.destroy());
    request.once("error", () => finish(false));
  });
}

module.exports = { probeHttp, withTimeout };
