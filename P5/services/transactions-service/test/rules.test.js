import test from "node:test";
import assert from "node:assert";
import {
  PositiveAmountRule,
  AmountLimitRule,
  DistinctAccountsRule,
  AccountFormatRule,
} from "../dist/validation/rules.js";

const base = {
  sourceAccount: "1234567890",
  targetAccount: "0987654321",
  beneficiary: "Juan Perez",
  amount: 100,
};

const casosMonto = [
  { descripcion: "acepta un monto positivo", amount: 100, esperado: true },
  { descripcion: "acepta un monto decimal pequeno", amount: 0.01, esperado: true },
  { descripcion: "rechaza un monto de cero", amount: 0, esperado: false },
  { descripcion: "rechaza un monto negativo", amount: -50, esperado: false },
];

for (const caso of casosMonto) {
  test(`PositiveAmountRule ${caso.descripcion}`, () => {
    const regla = new PositiveAmountRule();

    const resultado = regla.isSatisfiedBy({ ...base, amount: caso.amount });

    assert.strictEqual(resultado, caso.esperado);
  });
}

const casosLimite = [
  { descripcion: "acepta un monto por debajo del limite", amount: 49999, esperado: true },
  { descripcion: "acepta un monto igual al limite", amount: 50000, esperado: true },
  { descripcion: "rechaza un monto por encima del limite", amount: 50001, esperado: false },
];

for (const caso of casosLimite) {
  test(`AmountLimitRule ${caso.descripcion}`, () => {
    const regla = new AmountLimitRule(50000);

    const resultado = regla.isSatisfiedBy({ ...base, amount: caso.amount });

    assert.strictEqual(resultado, caso.esperado);
  });
}

const casosCuentas = [
  {
    descripcion: "acepta cuentas distintas",
    sourceAccount: "1234567890",
    targetAccount: "0987654321",
    esperado: true,
  },
  {
    descripcion: "rechaza cuentas iguales",
    sourceAccount: "1234567890",
    targetAccount: "1234567890",
    esperado: false,
  },
];

for (const caso of casosCuentas) {
  test(`DistinctAccountsRule ${caso.descripcion}`, () => {
    const regla = new DistinctAccountsRule();

    const resultado = regla.isSatisfiedBy({
      ...base,
      sourceAccount: caso.sourceAccount,
      targetAccount: caso.targetAccount,
    });

    assert.strictEqual(resultado, caso.esperado);
  });
}

const casosFormato = [
  {
    descripcion: "acepta cuentas de diez digitos",
    sourceAccount: "1234567890",
    targetAccount: "0987654321",
    esperado: true,
  },
  {
    descripcion: "rechaza una cuenta de nueve digitos",
    sourceAccount: "123456789",
    targetAccount: "0987654321",
    esperado: false,
  },
  {
    descripcion: "rechaza una cuenta de once digitos",
    sourceAccount: "12345678901",
    targetAccount: "0987654321",
    esperado: false,
  },
  {
    descripcion: "rechaza una cuenta con letras",
    sourceAccount: "12345abcde",
    targetAccount: "0987654321",
    esperado: false,
  },
  {
    descripcion: "rechaza cuando la cuenta destino es invalida",
    sourceAccount: "1234567890",
    targetAccount: "",
    esperado: false,
  },
];

for (const caso of casosFormato) {
  test(`AccountFormatRule ${caso.descripcion}`, () => {
    const regla = new AccountFormatRule();

    const resultado = regla.isSatisfiedBy({
      ...base,
      sourceAccount: caso.sourceAccount,
      targetAccount: caso.targetAccount,
    });

    assert.strictEqual(resultado, caso.esperado);
  });
}

test("cada regla expone el motivo del rechazo", () => {
  assert.strictEqual(new PositiveAmountRule().reason, "monto_no_positivo");
  assert.strictEqual(new AmountLimitRule(50000).reason, "monto_excede_limite");
  assert.strictEqual(new DistinctAccountsRule().reason, "cuentas_iguales");
  assert.strictEqual(new AccountFormatRule().reason, "cuenta_invalida");
});
