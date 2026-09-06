import test from "node:test";
import assert from "node:assert";
import { RoleRoutePolicy } from "../dist/policy/role-route-policy.js";

const casosPermitidos = [
  { role: "admin", route: "transactions" },
  { role: "maker", route: "transactions" },
  { role: "authorizer", route: "transactions" },
  { role: "auditor", route: "transactions" },
  { role: "admin", route: "approvals" },
  { role: "checker", route: "approvals" },
  { role: "admin", route: "audit" },
  { role: "auditor", route: "audit" },
  { role: "authorizer", route: "notifications" },
];

for (const caso of casosPermitidos) {
  test(`RoleRoutePolicy permite el rol ${caso.role} en la ruta ${caso.route}`, () => {
    const politica = new RoleRoutePolicy();

    const resultado = politica.isAllowed(caso.role, caso.route);

    assert.strictEqual(resultado, true);
  });
}

const casosDenegados = [
  { role: "checker", route: "transactions" },
  { role: "auditor", route: "approvals" },
  { role: "maker", route: "audit" },
  { role: "checker", route: "audit" },
  { role: "maker", route: "notifications" },
  { role: "checker", route: "notifications" },
];

for (const caso of casosDenegados) {
  test(`RoleRoutePolicy deniega el rol ${caso.role} en la ruta ${caso.route}`, () => {
    const politica = new RoleRoutePolicy();

    const resultado = politica.isAllowed(caso.role, caso.route);

    assert.strictEqual(resultado, false);
  });
}

test("RoleRoutePolicy concede al rol admin acceso a todas las rutas", () => {
  const politica = new RoleRoutePolicy();
  const rutas = ["transactions", "approvals", "audit", "notifications"];

  for (const ruta of rutas) {
    assert.strictEqual(politica.isAllowed("admin", ruta), true, `admin deberia acceder a ${ruta}`);
  }
});
