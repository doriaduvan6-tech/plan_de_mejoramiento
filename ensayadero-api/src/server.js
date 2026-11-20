import express from 'express';
import cors from 'cors';
import prisma from './db.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173']
}));

app.use(express.json());

// Ruta de verificación (Paso #4)
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok' });
});

// Paso #20: Validar los datos de entrada
async function validarDatosReserva(body) {
  const { solicitante, inicio, fin, instrumentoId } = body;

  if (typeof solicitante !== 'string' || solicitante.trim() === '') {
    return { error: 'El campo solicitante es obligatorio y no puede estar vacío' };
  }

  if (!inicio || !fin || instrumentoId === undefined || instrumentoId === null || instrumentoId === '') {
    return { error: 'Los campos inicio, fin e instrumentoId son obligatorios' };
  }

  const inicioDate = new Date(inicio);
  const finDate = new Date(fin);

  if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
    return { error: 'Las fechas inicio y fin deben tener un formato ISO 8601 válido' };
  }

  // Regla R3: inicio debe ser menor que fin
  if (inicioDate >= finDate) {
    return { error: 'La hora de inicio debe ser menor que la hora de fin' };
  }

  const instId = Number(instrumentoId);
  if (!Number.isInteger(instId) || instId <= 0) {
    return { error: 'El instrumentoId debe ser un número entero válido' };
  }

  const instrumento = await prisma.instrumento.findUnique({
    where: { id: instId }
  });

  if (!instrumento) {
    return { error: 'El instrumento seleccionado no existe' };
  }

  return {
    datos: {
      solicitante: solicitante.trim(),
      inicio: inicioDate,
      fin: finDate,
      instrumentoId: instId
    }
  };
}

// Paso #21: Función de conflicto en base de datos
async function buscarConflicto(db, { instrumentoId, inicio, fin, excluirId }) {
  return db.reserva.findFirst({
    where: {
      instrumentoId,
      inicio: { lt: fin },
      fin: { gt: inicio },
      ...(excluirId !== undefined ? { id: { not: excluirId } } : {})
    }
  });
}

// Paso #22: Rutas de lectura
app.get('/api/instrumentos', async (req, res, next) => {
  try {
    const instrumentos = await prisma.instrumento.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(instrumentos);
  } catch (error) {
    next(error);
  }
});

app.get('/api/reservas', async (req, res, next) => {
  try {
    const { instrumentoId } = req.query;
    const where = {};

    if (instrumentoId !== undefined && instrumentoId !== '') {
      const instId = Number(instrumentoId);
      if (Number.isNaN(instId)) {
        return res.status(400).json({ error: 'instrumentoId inválido' });
      }
      where.instrumentoId = instId;
    }

    const reservas = await prisma.reserva.findMany({
      where,
      orderBy: { inicio: 'asc' }
    });
    res.json(reservas);
  } catch (error) {
    next(error);
  }
});

app.get('/api/reservas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const reserva = await prisma.reserva.findUnique({
      where: { id }
    });

    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    res.json(reserva);
  } catch (error) {
    next(error);
  }
});

// Paso #23: Crear reserva (POST con transacción)
app.post('/api/reservas', async (req, res, next) => {
  try {
    const validacion = await validarDatosReserva(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const { datos } = validacion;

    const resultado = await prisma.$transaction(async (tx) => {
      const conflicto = await buscarConflicto(tx, datos);
      if (conflicto) {
        return { conflicto };
      }

      const reserva = await tx.reserva.create({
        data: datos
      });
      return { reserva };
    });

    if (resultado.conflicto) {
      return res.status(409).json({
        error: 'Horario ocupado',
        conflicto: resultado.conflicto
      });
    }

    res.status(201).json(resultado.reserva);
  } catch (error) {
    next(error);
  }
});

// Paso #24: Modificar reserva (PUT con transacción y excluirId)
app.put('/api/reservas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const validacion = await validarDatosReserva(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const { datos } = validacion;

    const resultado = await prisma.$transaction(async (tx) => {
      const existente = await tx.reserva.findUnique({ where: { id } });
      if (!existente) {
        return { noEncontrada: true };
      }

      const conflicto = await buscarConflicto(tx, {
        ...datos,
        excluirId: id
      });

      if (conflicto) {
        return { conflicto };
      }

      const reserva = await tx.reserva.update({
        where: { id },
        data: datos
      });
      return { reserva };
    });

    if (resultado.noEncontrada) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (resultado.conflicto) {
      return res.status(409).json({
        error: 'Horario ocupado',
        conflicto: resultado.conflicto
      });
    }

    res.json(resultado.reserva);
  } catch (error) {
    next(error);
  }
});

// Paso #25: Eliminar reserva (DELETE) y manejo de P2025
app.delete('/api/reservas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await prisma.reserva.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    next(error);
  }
});

// Manejo genérico de errores inesperados (500)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API en http://localhost:${PORT}`);
});
