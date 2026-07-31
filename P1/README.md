## Principios SOLID aplicados

### S — Responsabilidad Única (SRP)

Una clase o archivo deberia tener una sola razon para cambiar, o sea hacer
una sola cosa. Si se mezclan varias tareas en el mismo lugar, cualquier cambio
en una puede afectar a las otras sin querer.

En el proyecto esto se ve en como se separa el codigo en tres archivos:

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
base de datos, solo toco `repository.py`. Las rutas no ven ese cambio.

### O — Abierto/Cerrado (OCP)

El codigo deberia poder extenderse sin tener que
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

Si en el futuro se quisiera, por ejemplo, un repositorio en memoria para hacer
pruebas sin conectarse a Postgres, solo se tendria que crear otra clase que
implemente `SolicitudRepository`, no hay que tocar `service.py` ni
`main.py` para eso.

### L — Sustitución de Liskov (LSP)

Si una clase hereda de otra, deberia poder
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

Esto significa que a `SolicitudService` se le puede pasar `Postgres` o
cualquier otra implementacion futura, y el servicio va a seguir
funcionando igual porque todas cumplen el mismo contrato.

### I — Segregación de Interfaces (ISP)

Es mejor tener varias interfaces y especificas, que una sola gigante
con metodos que no todos los que la usan van a necesitar.

En vez de una sola interfaz de repositorio con todo mezclado, se separe en
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
hubiera algo que solo necesite leer datos, podria
depender unicamente de `LectorSolicitudes` sin arrastrar los metodos de
escritura que no le sirven.

### D — Inversión de Dependencias (DIP)

Hay partes del sistema no deberian depender
directamente de librerias o tecnologias especificas, sino de una
abstraccion.

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


