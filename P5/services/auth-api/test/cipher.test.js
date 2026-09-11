import test from "node:test";
import assert from "node:assert";
import { AesDeterministicCipher } from "../dist/crypto/aes-deterministic-cipher.js";
import { AesRandomCipher } from "../dist/crypto/aes-random-cipher.js";

const llave = Buffer.alloc(32, 7);

const textos = [
  { descripcion: "un correo electronico", valor: "usuario@ejemplo.test" },
  { descripcion: "un texto con espacios", valor: "Juan Carlos Perez" },
  { descripcion: "un texto con acentos", valor: "Jose Martinez Nunez" },
  { descripcion: "una cadena vacia", valor: "" },
  { descripcion: "un texto largo", valor: "a".repeat(500) },
];

for (const caso of textos) {
  test(`AesDeterministicCipher recupera el original con ${caso.descripcion}`, () => {
    const cifrador = new AesDeterministicCipher(llave);

    const cifrado = cifrador.encrypt(caso.valor);
    const descifrado = cifrador.decrypt(cifrado);

    assert.strictEqual(descifrado, caso.valor);
  });
}

for (const caso of textos) {
  test(`AesRandomCipher recupera el original con ${caso.descripcion}`, () => {
    const cifrador = new AesRandomCipher(llave);

    const cifrado = cifrador.encrypt(caso.valor);
    const descifrado = cifrador.decrypt(cifrado);

    assert.strictEqual(descifrado, caso.valor);
  });
}

test("AesDeterministicCipher produce siempre el mismo resultado para el mismo texto", () => {
  const cifrador = new AesDeterministicCipher(llave);

  const primero = cifrador.encrypt("usuario@ejemplo.test");
  const segundo = cifrador.encrypt("usuario@ejemplo.test");

  assert.strictEqual(primero, segundo);
});

test("AesRandomCipher produce resultados distintos para el mismo texto", () => {
  const cifrador = new AesRandomCipher(llave);

  const primero = cifrador.encrypt("usuario@ejemplo.test");
  const segundo = cifrador.encrypt("usuario@ejemplo.test");

  assert.notStrictEqual(primero, segundo);
});

test("el texto cifrado no revela el original", () => {
  const cifrador = new AesDeterministicCipher(llave);

  const cifrado = cifrador.encrypt("usuario@ejemplo.test");

  assert.ok(!cifrado.includes("usuario"));
});

test("textos distintos producen cifrados distintos", () => {
  const cifrador = new AesDeterministicCipher(llave);

  const primero = cifrador.encrypt("usuario@ejemplo.test");
  const segundo = cifrador.encrypt("otro@ejemplo.test");

  assert.notStrictEqual(primero, segundo);
});
