// Regla de solapamiento (Paso #17 y #18)
export function haySolapamiento(a, b) {
  const inicioA = new Date(a.inicio);
  const finA = new Date(a.fin);
  const inicioB = new Date(b.inicio);
  const finB = new Date(b.fin);

  return inicioA < finB && finA > inicioB;
}

const existente = {
  inicio: '2026-12-01T10:00:00.000Z',
  fin: '2026-12-01T12:00:00.000Z'
};

const casos = [
  { caso: 1, descripcion: '08:00 a 09:00 (antes)', inicio: '2026-12-01T08:00:00.000Z', fin: '2026-12-01T09:00:00.000Z', esperado: false },
  { caso: 2, descripcion: '09:00 a 10:00 (consecutivo antes)', inicio: '2026-12-01T09:00:00.000Z', fin: '2026-12-01T10:00:00.000Z', esperado: false },
  { caso: 3, descripcion: '09:00 a 11:00 (cruza inicio)', inicio: '2026-12-01T09:00:00.000Z', fin: '2026-12-01T11:00:00.000Z', esperado: true },
  { caso: 4, descripcion: '10:30 a 11:30 (dentro)', inicio: '2026-12-01T10:30:00.000Z', fin: '2026-12-01T11:30:00.000Z', esperado: true },
  { caso: 5, descripcion: '11:00 a 13:00 (cruza final)', inicio: '2026-12-01T11:00:00.000Z', fin: '2026-12-01T13:00:00.000Z', esperado: true },
  { caso: 6, descripcion: '09:00 a 13:00 (envuelve)', inicio: '2026-12-01T09:00:00.000Z', fin: '2026-12-01T13:00:00.000Z', esperado: true },
  { caso: 7, descripcion: '10:00 a 12:00 (idéntica)', inicio: '2026-12-01T10:00:00.000Z', fin: '2026-12-01T12:00:00.000Z', esperado: true },
  { caso: 8, descripcion: '12:00 a 13:00 (consecutivo después)', inicio: '2026-12-01T12:00:00.000Z', fin: '2026-12-01T13:00:00.000Z', esperado: false }
];

const resultados = casos.map((c) => {
  const obtenido = haySolapamiento(existente, { inicio: c.inicio, fin: c.fin });
  return {
    Caso: c.caso,
    Horario: c.descripcion,
    Esperado: c.esperado,
    Obtenido: obtenido,
    Estado: obtenido === c.esperado ? 'OK' : 'ERROR'
  };
});

console.table(resultados);
