
// arma el texto completo del folio de un oficio, ej. "P-050/2026".


export function formatearFolio(numero, prefijo, anio) {
    return `${prefijo}-${numero || 'XXX'}/${anio}`
}


// para armar "MEMORANDUM NO: P-084/2026" u "Oficio No. P-040/2026" 
// compartida entre bitacora y bitacorasecapo

export function folioRealDe(doc, prefijo, anio) {
    const numero = doc?.campos?.numero_oficio
    if (!numero) return null
    const texto = formatearFolio(numero, prefijo, anio)
    return doc.tipo?.startsWith('memorandum') ? `MEMORANDUM NO: ${texto}` : `Oficio No. ${texto}`
}

export function textoVinculado(doc, documentos, prefijo, anio) {
    if (!doc.vinculadoCon) return null
    const otro = documentos.find(d => d.id === doc.vinculadoCon)
    if (!otro) return 'otro documento'
    return folioRealDe(otro, prefijo, anio) || otro.folio
}