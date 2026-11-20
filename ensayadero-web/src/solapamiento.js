export function haySolapamiento(a, b) {
  const inicioA = new Date(a.inicio);
  const finA = new Date(a.fin);
  const inicioB = new Date(b.inicio);
  const finB = new Date(b.fin);

  return inicioA < finB && finA > inicioB;
}
