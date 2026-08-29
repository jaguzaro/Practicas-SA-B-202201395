# Tamano de las imagenes

Cada microservicio se construye con un Dockerfile de varias etapas sobre una imagen base minima. Para poder comparar se construyo tambien una version ingenua de cada uno, de una sola etapa, sobre la imagen base completa del lenguaje y arrastrando hasta el final las dependencias de compilacion.

| Servicio | Lenguaje | Antes | Despues |
|---|---|---|---|
| auth-api | TypeScript | 1.74 GB | 287 MB |
| authz-service | TypeScript | 1.73 GB | 283 MB |
| transactions-service | TypeScript | 1.74 GB | 288 MB |
| audit-service | Python | 1.74 GB | 325 MB |
| cronjobs | Python | | 236 MB |

Los servicios de TypeScript corren sobre node en su variante alpine y los de Python sobre python en su variante slim. Las versiones ingenuas se construyeron sobre las imagenes completas, que incluyen compiladores y herramientas que la aplicacion no necesita para ejecutarse.

En los servicios de TypeScript la primera etapa instala todas las dependencias, incluidas las de desarrollo, y compila el codigo, mientras que la segunda parte de cero, instala solo las de produccion y copia unicamente el directorio compilado, de modo que ni el compilador ni el codigo fuente llegan a la imagen final. En los de Python la primera etapa construye las dependencias como wheels, lo que compila cualquier extension nativa, y la segunda las instala desde ahi y borra el directorio temporal. A eso se suma el peso de la base, porque las imagenes completas de node y de python rondan el gigabyte mientras que sus variantes reducidas se quedan cerca de los ciento treinta megabytes.
