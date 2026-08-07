import { useEffect, useState } from "react";
import { Badge, Button, Flex, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { logout, me } from "../api/client";
import type { Role } from "../api/client";
import { RouteTester } from "../components/RouteTester";

export function ConfirmationPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    me()
      .then((response) => setRole(response.auth.role))
      .catch(() => navigate("/login"))
      .finally(() => setChecking(false));
  }, [navigate]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  if (checking) {
    return <Spinner />;
  }

  return (
    <Stack gap="8">
      <Flex justify="space-between" align="start">
        <Stack gap="2">
          <Heading size="lg">Login exitoso</Heading>
          <Text>
            Sesión activa con rol{" "}
            <Badge colorPalette={role === "admin" ? "purple" : "blue"}>{role}</Badge>
          </Text>
        </Stack>
        <Button onClick={handleLogout} loading={loggingOut} variant="outline" colorPalette="red">
          Cerrar sesión
        </Button>
      </Flex>

      <Stack gap="4">
        <Heading size="md">Probar rutas protegidas</Heading>
        <RouteTester route="ruta1" label="Ruta 1" description="Solo Admin puede acceder" />
        <RouteTester route="ruta2" label="Ruta 2" description="Admin y Cliente pueden acceder" />
      </Stack>
    </Stack>
  );
}
