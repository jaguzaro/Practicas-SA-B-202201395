import { Box, Container, Flex, Heading, Link as ChakraLink } from "@chakra-ui/react";
import { Link as RouterLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <Box minH="100vh">
      <Box borderBottomWidth="1px" py="4">
        <Container maxW="container.md">
          <Flex align="center" justify="space-between">
            <Heading size="md">Práctica 2 — Auth</Heading>
            <Flex gap="4">
              <ChakraLink asChild>
                <RouterLink to="/login">Login</RouterLink>
              </ChakraLink>
              <ChakraLink asChild>
                <RouterLink to="/register">Registro</RouterLink>
              </ChakraLink>
            </Flex>
          </Flex>
        </Container>
      </Box>
      <Container maxW="container.md" py="10">
        <Outlet />
      </Container>
    </Box>
  );
}
