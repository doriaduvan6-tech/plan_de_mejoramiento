const BASE_URL = 'http://localhost:3000/api';

async function manejarRespuesta(res) {
  if (!res.ok) {
    let mensaje = `Error HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) {
        mensaje = data.error;
      }
    } catch {
      // Ignorar si el cuerpo no es JSON
    }
    const error = new Error(mensaje);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export async function listarInstrumentos() {
  const res = await fetch(`${BASE_URL}/instrumentos`);
  return manejarRespuesta(res);
}

export async function listarReservas(instrumentoId) {
  const res = await fetch(`${BASE_URL}/reservas?instrumentoId=${instrumentoId}`);
  return manejarRespuesta(res);
}

export async function crearReserva(datos) {
  const res = await fetch(`${BASE_URL}/reservas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return manejarRespuesta(res);
}

export async function eliminarReserva(id) {
  const res = await fetch(`${BASE_URL}/reservas/${id}`, {
    method: 'DELETE'
  });
  return manejarRespuesta(res);
}
