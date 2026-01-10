const tsCaso = (c) => Math.max(...c.eventos.map((e) => e.tsInc));

const esPanico = (c) =>
  Object.keys(c.repeticiones).some((t) => t.includes("PANICO"));

export { tsCaso, esPanico };