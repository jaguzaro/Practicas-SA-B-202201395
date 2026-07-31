# Contexto

Este proyecto es una API REST con FastAPI y PostgreSQL para gestionar
solicitudes operativas de una academia ficticia, el CRUD ya esta funcionando
en la carpeta `api/` (GET, POST, PUT, DELETE y PATCH de estado).

# Lo que necesito

Quiero que mejores el codigo aplicando principios SOLID, de forma que se
note claramente el uso de minimo 4 principios:

- **SRP**: separar rutas, logica de negocio y acceso a datos en archivos
  distintos, cada uno con una sola responsabilidad.
- **OCP**: que se puedan agregar cambios (como una nueva forma de guardar
  datos) sin tener que modificar el codigo que ya funciona.
- **LSP**: si usas clases o interfaces, cualquier implementacion debe poder
  reemplazar a otra sin romper nada.
- **ISP**: interfaces pequeñas y especificas, no una sola con metodos que
  no todos usan.
- **DIP**: que las rutas dependan de abstracciones (una interfaz) y no
  directamente de psycopg2.

No hace falta explicarlos a fondo en el codigo, con que se reflejen bien
basta.

# Consideraciones

- No cambies el comportamiento de los endpoints, solo como esta organizado
  el codigo.
- Mantenlo simple, sin agregar librerias ni cosas que no se necesiten.
- Sigue usando PostgreSQL con psycopg2 y las validaciones que ya existen en
  `schemas.py`.
- Las consultas SQL deben seguir siendo parametrizadas (nada de f-strings).

Al final explicame brevemente que principio aplicaste en cada archivo para
poder verificarlo.

# Revision de los resultados

Despues de pedirle a la IA que refactorizara el codigo, esto fue lo que
revise:

- Separo el codigo en tres archivos (`main.py`, `service.py`,
  `repository.py`), cada uno con una responsabilidad clara, me parece
  correcto porque antes todo estaba mezclado en `main.py`.
- Agrego una clase abstracta `SolicitudRepository` para el acceso a datos
  al principio pense que era una capa de mas para un proyecto tan pequeno,
  pero tiene sentido porque permite cambiar como se guardan los datos sin
  tocar `service.py`, que es justo lo que piden OCP y DIP.
- Separo la interfaz en `LectorSolicitudes` y `EscritorSolicitudes` en vez
  de una sola con todos los metodos. Es un poco forzado porque todavia no
  hay un consumidor que solo necesite leer, pero se quedo asi porque
  demuestra ISP de forma clara sin complicar el resto del codigo.
- Probe los 5 endpoints despues del cambio, y el comportamiento quedo
  exactamente igual ya que no hubo que corregir nada funcional.
