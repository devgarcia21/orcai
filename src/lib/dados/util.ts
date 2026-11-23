const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita consultar o banco com ids malformados vindos da URL. */
export function idValido(id: string): boolean {
  return UUID.test(id);
}
