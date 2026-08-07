import { useState } from "react";
import { Badge, Button, Stack, Text } from "@chakra-ui/react";
import { checkProtectedRoute } from "../api/client";
import type { ProtectedRouteResult } from "../api/client";

interface RouteTesterProps {
  route: "ruta1" | "ruta2";
  label: string;
  description: string;
}

export function RouteTester({ route, label, description }: RouteTesterProps) {
  const [result, setResult] = useState<ProtectedRouteResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const outcome = await checkProtectedRoute(route);
      setResult(outcome);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack borderWidth="1px" borderRadius="md" p="4" gap="3">
      <Text fontWeight="semibold">{label}</Text>
      <Text fontSize="sm" color="fg.muted">
        {description}
      </Text>
      <Button onClick={handleClick} loading={loading} size="sm" alignSelf="start">
        Probar acceso
      </Button>
      {result && (
        <Badge colorPalette={result.allowed ? "green" : "red"} alignSelf="start">
          {result.allowed ? "Acceso permitido" : `Acceso denegado (${result.status})`}
        </Badge>
      )}
    </Stack>
  );
}
