import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Field, Heading, Input, NativeSelect, Stack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/client";
import type { Role } from "../api/client";

export function RegisterPage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Role>("cliente");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ nombre, correo, password, rol });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="6" maxW="sm" mx="auto">
      <Heading size="lg">Crear cuenta</Heading>
      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}
      <form onSubmit={handleSubmit}>
        <Stack gap="4">
          <Field.Root required>
            <Field.Label>Nombre</Field.Label>
            <Input value={nombre} onChange={(event) => setNombre(event.target.value)} />
          </Field.Root>
          <Field.Root required>
            <Field.Label>Correo</Field.Label>
            <Input type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} />
          </Field.Root>
          <Field.Root required>
            <Field.Label>Contraseña</Field.Label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label>Rol</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field value={rol} onChange={(event) => setRol(event.target.value as Role)}>
                <option value="cliente">Cliente</option>
                <option value="admin">Admin</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Button type="submit" loading={loading} colorPalette="purple">
            Registrarme
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
