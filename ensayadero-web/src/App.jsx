import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  listarInstrumentos,
  listarReservas,
  crearReserva,
  eliminarReserva
} from './api.js';
import { haySolapamiento } from './solapamiento.js';

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

export default function App() {
  const [instrumentos, setInstrumentos] = useState([]);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const [solicitante, setSolicitante] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');

  // Cargar instrumentos al montar el componente (Paso #32)
  useEffect(() => {
    async function cargarInstrumentos() {
      try {
        const lista = await listarInstrumentos();
        setInstrumentos(lista);
        if (lista.length > 0) {
          setInstrumentoSeleccionado(lista[0]);
        }
      } catch (err) {
        setMensaje({ tipo: 'error', texto: err.message });
      }
    }
    cargarInstrumentos();
  }, []);

  // Recargar reservas cuando cambia el instrumento seleccionado (Paso #32)
  async function recargarReservas(id) {
    try {
      const lista = await listarReservas(id);
      setReservas(lista);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  useEffect(() => {
    if (instrumentoSeleccionado) {
      recargarReservas(instrumentoSeleccionado.id);
    }
  }, [instrumentoSeleccionado]);

  // Validación en tiempo real en el navegador (Paso #36)
  let errorValidacion = '';
  if (inicio && fin) {
    const dInicio = new Date(inicio);
    const dFin = new Date(fin);

    if (dInicio >= dFin) {
      errorValidacion = 'La hora de inicio debe ser menor que la de fin';
    } else {
      const choque = reservas.find((r) =>
        haySolapamiento({ inicio: dInicio, fin: dFin }, r)
      );
      if (choque) {
        const horaIni = format(new Date(choque.inicio), 'HH:mm');
        const horaFin = format(new Date(choque.fin), 'HH:mm');
        errorValidacion = `Ese horario ya está ocupado de ${horaIni} a ${horaFin} por ${choque.solicitante}`;
      }
    }
  }

  // Eventos formateados para react-big-calendar (Paso #34)
  const eventos = reservas.map((r) => ({
    id: r.id,
    title: r.solicitante,
    start: new Date(r.inicio),
    end: new Date(r.fin)
  }));

  // Seleccionar rango arrastrando en el calendario (Paso #38)
  function manejarSeleccionSlot({ start, end }) {
    setInicio(format(start, "yyyy-MM-dd'T'HH:mm"));
    setFin(format(end, "yyyy-MM-dd'T'HH:mm"));
    setMensaje(null);
  }

  // Enviar solicitud a la API (Paso #37)
  async function manejarEnvio(e) {
    e.preventDefault();
    if (!instrumentoSeleccionado || errorValidacion) return;

    try {
      await crearReserva({
        solicitante: solicitante.trim(),
        inicio: new Date(inicio).toISOString(),
        fin: new Date(fin).toISOString(),
        instrumentoId: instrumentoSeleccionado.id
      });

      await recargarReservas(instrumentoSeleccionado.id);
      setSolicitante('');
      setInicio('');
      setFin('');
      setMensaje({ tipo: 'exito', texto: 'Reserva creada correctamente' });
    } catch (err) {
      if (err.status === 409) {
        setMensaje({
          tipo: 'error',
          texto: 'Horario ocupado: otra persona pudo reservar justo antes de que enviaras.'
        });
        await recargarReservas(instrumentoSeleccionado.id);
      } else {
        setMensaje({ tipo: 'error', texto: err.message });
      }
    }
  }

  // Cancelar reserva al hacer clic en un evento (Paso #39)
  async function manejarSeleccionEvento(evento) {
    const confirmar = window.confirm(
      `¿Deseas cancelar la reserva de ${evento.title}?`
    );
    if (!confirmar) return;

    try {
      await eliminarReserva(evento.id);
      await recargarReservas(instrumentoSeleccionado.id);
      setMensaje({ tipo: 'exito', texto: 'Reserva cancelada' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Agendamiento de Ensayadero</h1>

      {/* Selector de instrumento (Paso #33) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {instrumentos.map((inst) => {
          const activo = instrumentoSeleccionado?.id === inst.id;
          return (
            <button
              key={inst.id}
              type="button"
              onClick={() => {
                setInstrumentoSeleccionado(inst);
                setMensaje(null);
              }}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: activo ? '2px solid #0f766e' : '1px solid #ccc',
                backgroundColor: activo ? '#0f766e' : '#f3f4f6',
                color: activo ? '#fff' : '#111'
              }}
            >
              {inst.nombre}
            </button>
          );
        })}
      </div>

      {/* Mensajes de estado */}
      {mensaje && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '6px',
            backgroundColor: mensaje.tipo === 'error' ? '#fee2e2' : '#dcfce7',
            color: mensaje.tipo === 'error' ? '#991b1b' : '#166534'
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Calendario semanal/diario (Paso #34 y #38) */}
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            culture="es"
            events={eventos}
            views={['week', 'day']}
            defaultView="week"
            selectable
            onSelectSlot={manejarSeleccionSlot}
            onSelectEvent={manejarSeleccionEvento}
            style={{ height: '100%' }}
          />
        </div>

        {/* Formulario de solicitud (Paso #35 y #36) */}
        <form
          onSubmit={manejarEnvio}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px' }}>Nueva reserva</h2>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            Solicitante
            <input
              type="text"
              required
              value={solicitante}
              onChange={(e) => setSolicitante(e.target.value)}
              placeholder="Tu nombre"
              style={{ padding: '8px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            Instrumento
            <input
              type="text"
              readOnly
              value={instrumentoSeleccionado?.nombre || ''}
              style={{ padding: '8px', backgroundColor: '#f3f4f6' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            Inicio
            <input
              type="datetime-local"
              required
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              style={{ padding: '8px' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            Fin
            <input
              type="datetime-local"
              required
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              style={{ padding: '8px' }}
            />
          </label>

          {errorValidacion && (
            <p style={{ color: '#dc2626', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
              {errorValidacion}
            </p>
          )}

          <button
            type="submit"
            disabled={Boolean(errorValidacion)}
            style={{
              padding: '10px',
              backgroundColor: errorValidacion ? '#9ca3af' : '#0f766e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: errorValidacion ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            Solicitar reserva
          </button>
        </form>
      </div>
    </div>
  );
}
