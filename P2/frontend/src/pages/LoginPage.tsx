import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Field, Heading, Input, Stack } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered);

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ correo, password });
      navigate("/confirmacion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="6" maxW="sm" mx="auto">
      <Heading size="lg">Iniciar sesión</Heading>
      {justRegistered && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Title>Registro exitoso, ahora inicia sesión</Alert.Title>
        </Alert.Root>
      )}
      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}
      <form onSubmit={handleSubmit}>
        <Stack gap="4">
          <Field.Root required>
            <Field.Label>Correo</Field.Label>
            <Input type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} />
          </Field.Root>
          <Field.Root required>
            <Field.Label>Contraseña</Field.Label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field.Root>
          <Button type="submit" loading={loading} colorPalette="purple">
            Entrar
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
