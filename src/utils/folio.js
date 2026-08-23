
// arma el texto completo del folio de un oficio, ej. "P-050/2026".


export function formatearFolio(numero, prefijo, anio) {
    return `${prefijo}-${numero || 'XXX'}/${anio}`
}