from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.auth.token_verifier import InvalidTokenError, JwtTokenVerifier

SECRETO = "secreto-de-prueba"


def crear_token(payload: dict, secreto: str = SECRETO) -> str:
    return jwt.encode(payload, secreto, algorithm="HS256")


@pytest.mark.parametrize("rol", ["admin", "maker", "checker", "authorizer", "auditor"])
def test_acepta_todos_los_roles_validos(rol):
    verificador = JwtTokenVerifier(SECRETO)
    token = crear_token({"sub": "42", "role": rol})

    resultado = verificador.verify(token)

    assert resultado.subject == "42"
    assert resultado.role == rol


def test_rechaza_un_token_firmado_con_otro_secreto():
    verificador = JwtTokenVerifier(SECRETO)
    token = crear_token({"sub": "42", "role": "admin"}, secreto="secreto-equivocado")

    with pytest.raises(InvalidTokenError):
        verificador.verify(token)


def test_rechaza_un_token_expirado():
    verificador = JwtTokenVerifier(SECRETO)
    expiracion = datetime.now(timezone.utc) - timedelta(hours=1)
    token = crear_token({"sub": "42", "role": "admin", "exp": expiracion})

    with pytest.raises(InvalidTokenError):
        verificador.verify(token)


def test_rechaza_un_token_con_un_rol_inexistente():
    verificador = JwtTokenVerifier(SECRETO)
    token = crear_token({"sub": "42", "role": "superusuario"})

    with pytest.raises(InvalidTokenError):
        verificador.verify(token)


def test_rechaza_un_token_sin_identificador():
    verificador = JwtTokenVerifier(SECRETO)
    token = crear_token({"role": "admin"})

    with pytest.raises(InvalidTokenError):
        verificador.verify(token)


def test_rechaza_un_identificador_que_no_es_texto():
    verificador = JwtTokenVerifier(SECRETO)
    token = crear_token({"sub": 42, "role": "admin"})

    with pytest.raises(InvalidTokenError):
        verificador.verify(token)


def test_rechaza_un_texto_que_no_es_un_token():
    verificador = JwtTokenVerifier(SECRETO)

    with pytest.raises(InvalidTokenError):
        verificador.verify("esto-no-es-un-token")
