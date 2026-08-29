import http from "k6/http";
import { check } from "k6";

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

const BASE = __ENV.BASE_URL || "http://sa-p5.local";

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "2m", target: 60 },
    { duration: "2m", target: 120 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function () {
  const login = http.post(
    `${BASE}/login`,
    JSON.stringify({ correo: "carga@sa.test", password: "Carga12345" }),
    { headers: { "Content-Type": "application/json" }, tags: { endpoint: "login" } },
  );
  check(login, { "login respondio": (r) => r.status > 0 });

  const authorize = http.post(
    `${BASE}/authorize`,
    JSON.stringify({ token: "token-de-carga", route: "transactions" }),
    { headers: { "Content-Type": "application/json" }, tags: { endpoint: "authorize" } },
  );
  check(authorize, { "authorize respondio": (r) => r.status > 0 });

  const transacciones = http.get(`${BASE}/transactions/batches`, {
    tags: { endpoint: "transactions" },
  });
  check(transacciones, { "transactions respondio": (r) => r.status > 0 });
}
