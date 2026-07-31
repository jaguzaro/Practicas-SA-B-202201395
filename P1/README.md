# Practica 1 — API de Solicitudes Operativas

API REST hecha con FastAPI y PostgreSQL para gestionar las solicitudes
operativas de una academia ficticia, tiene los 5 endpoints pedidos: obtener
todas, registrar una nueva, actualizar completa, actualizar solo el estado,
y eliminar.

- `database/schema.sql` — script de creación de la tabla en PostgreSQL.
- `api/` — código de la API (rutas, lógica de negocio y acceso a datos).

## Principios SOLID aplicados

Para esta parte de la practica le pedi a la IA (con las instrucciones que
dejé en `CLAUDE.md`) que reorganizara el codigo aplicando SOLID. Antes todo
estaba junto en un solo archivo (rutas y SQL mezclados), ahora esta
dividido en capas. Abajo explico cada principio con mis palabras y en
donde queda reflejado.

### S — Responsabilidad Única (SRP)

Una clase o archivo deberia tener una sola razon para cambiar, o sea hacer
una sola cosa. Si mezclas varias tareas en el mismo lugar, cualquier cambio
en una puede afectar a las otras sin querer.

En el proyecto esto se ve en como separe el codigo en tres archivos:

- `main.py` solo recibe las peticiones HTTP y responde.
- `service.py` solo tiene la lógica de negocio.
- `repository.py` solo sabe hablar con la base de datos.

```python
# service.py
class SolicitudService:
    """Lógica de negocio (SRP): no sabe cómo se persisten los datos, solo usa el contrato (DIP)."""

    def __init__(self, repositorio: SolicitudRepository):
        self._repositorio = repositorio

    def registrar_solicitud(self, solicitud: SolicitudCreate) -> dict:
        return self._repositorio.crear(solicitud.model_dump())
```

Si mañana cambia una regla de negocio, solo toco `service.py`, si cambia la
base de datos, solo toco `repository.py`. Las rutas no se enteran de nada
de eso.

### O — Abierto/Cerrado (OCP)

El codigo deberia poder extenderse (agregarle cosas nuevas) sin tener que
modificar lo que ya funciona y ya fue probado.

Por eso `repository.py` no tiene una sola clase con el acceso a Postgres
metido directo, sino un contrato (`SolicitudRepository`) y una
implementacion concreta encima:

```python
class SolicitudRepository(LectorSolicitudes, EscritorSolicitudes, ABC):
    """Contrato de persistencia (OCP + DIP): el service depende de esto, no de psycopg2."""


class PostgresSolicitudRepository(SolicitudRepository):
    """Implementación concreta con psycopg2 (LSP: sustituye al contrato sin romper al service)."""
    ...
```

Si en el futuro quisiera, por ejemplo, un repositorio en memoria para hacer
pruebas sin conectarme a Postgres, solo tendria que crear otra clase que
implemente `SolicitudRepository`, no hay que tocar `service.py` ni
`main.py` para eso.

### L — Sustitución de Liskov (LSP)

Si una clase hereda de otra (o implementa una interfaz), deberia poder
usarse en cualquier lugar donde se espera esa interfaz, sin que las cosas
se rompan.

`PostgresSolicitudRepository` implementa todos los metodos que promete
`SolicitudRepository` (`listar`, `crear`, `actualizar`,
`actualizar_estado`, `eliminar`), con las mismas firmas. `SolicitudService`
solo conoce el tipo `SolicitudRepository`:

```python
# service.py
def __init__(self, repositorio: SolicitudRepository):
    self._repositorio = repositorio
```

Esto significa que a `SolicitudService` le puedo pasar `Postgres...` o
cualquier otra implementacion futura, y el servicio va a seguir
funcionando igual porque todas cumplen el mismo contrato.

### I — Segregación de Interfaces (ISP)

Es mejor tener varias interfaces chicas y especificas, que una sola gigante
con metodos que no todos los que la usan van a necesitar.

En vez de una sola interfaz de repositorio con todo mezclado, la separe en
dos:

```python
class LectorSolicitudes(ABC):
    """Interfaz de solo lectura (ISP)."""

    @abstractmethod
    def listar(self) -> list[dict]: ...


class EscritorSolicitudes(ABC):
    """Interfaz de escritura (ISP): separada de la de lectura."""

    @abstractmethod
    def crear(self, datos: dict) -> dict: ...
    ...
```

Ahora mismo el proyecto usa las dos juntas, pero si en algun momento
hubiera algo que solo necesite leer datos (por ejemplo un reporte), podria
depender unicamente de `LectorSolicitudes` sin arrastrar los metodos de
escritura que no le sirven.

### D — Inversión de Dependencias (DIP)

Las partes "de arriba" del sistema (como las rutas) no deberian depender
directamente de detalles tecnicos concretos (como psycopg2), sino de una
abstraccion. El detalle concreto se conecta desde afuera.

En `main.py` las rutas no crean conexiones a la base de datos ni usan
`psycopg2` directamente, reciben el servicio ya armado mediante `Depends`:

```python
def get_repository() -> SolicitudRepository:
    return PostgresSolicitudRepository()


def get_service(repositorio: SolicitudRepository = Depends(get_repository)) -> SolicitudService:
    """Inyección de dependencias (DIP): las rutas reciben el servicio, no un repositorio concreto."""
    return SolicitudService(repositorio)


@app.get("/solicitudes")
def obtener_solicitudes(service: SolicitudService = Depends(get_service)):
    return service.listar_solicitudes()
```

`SolicitudService` tampoco sabe que existe Postgres, solo conoce la
abstraccion `SolicitudRepository`. Quien decide que implementacion real se
usa es `get_repository()`, no cada ruta por su cuenta.

## Como lo verifique

Probe los 5 endpoints con `curl` contra una base PostgreSQL local antes y
despues del refactor, y el comportamiento (rutas, status codes, formato de
respuesta) no cambio en nada. El detalle de esa revision esta en
`CLAUDE.md`, en la sección "Revisión de los resultados".
