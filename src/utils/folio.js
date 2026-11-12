
// arma el texto completo del folio de un oficio, ej. "P-050/2026".

export function rellenarFolio(numero) {
    return String(numero).padStart(3, '0')
}

export function formatearFolio(numero, prefijo, anio) {
    return `${prefijo}-${numero ? rellenarFolio(numero) : 'XXX'}/${anio}`
}


export function folioActual(config) {
    return {
        prefijo: config?.folio?.prefijo_default || 'P',
        anio: config?.folio?.anio || new Date().getFullYear(),
    }
}

// para armar "MEMORANDUM NO: P-084/2026" u "Oficio No. P-040/2026" 
// compartida entre bitacora y bitacorasecapo

export function datosFolioDe(doc, prefijoActual, anioActual) {
    const c = doc?.campos || {}
    const anioCreacion = Number(String(doc?.fecha || '').split('/')[2]) || null
    return {
        prefijo: c.prefijo_folio || prefijoActual,
        anio: Number(c.anio_folio) || anioCreacion || anioActual,
    }
}


export function folioDelDocumento(doc, prefijoActual, anioActual) {
    const numero = doc?.campos?.numero_oficio
    if (!numero) return ''
    const { prefijo, anio } = datosFolioDe(doc, prefijoActual, anioActual)
    return formatearFolio(numero, prefijo, anio)
}


export function camposDeFolio({ numero, anio, prefijo }) {
    return { numero_oficio: numero, anio_folio: anio, prefijo_folio: prefijo }
}

export function folioRealDe(doc, prefijo, anio) {
    const texto = folioDelDocumento(doc, prefijo, anio)
    if (!texto) return null
    return doc.tipo?.startsWith('memorandum') ? `MEMORANDUM NO: ${texto}` : `Oficio No. ${texto}`
}

export function textoVinculado(doc, documentos, prefijo, anio) {
    if (!doc.vinculadoCon) return null
    const otro = documentos.find(d => d.id === doc.vinculadoCon)
    if (!otro) return null
    return folioRealDe(otro, prefijo, anio) || otro.folio
}

export function nombreParaArchivo(tipo, campos) {
    const principal = campos?.nombre_estudiante || campos?.nombre_destinatario
        || campos?.nombre_solicitante || campos?.nombre_proyecto || ''
    return [tipo, campos?.numero_oficio, principal]
        .filter(Boolean).join('_').replaceAll(' ', '_')
}

export function imprimirConTitulo(titulo) {
    const tituloOriginal = document.title
    document.title = titulo || 'documento'
    window.print()
    document.title = tituloOriginal
}


export function imprimirConNombre(tipo, campos) {
    imprimirConTitulo(nombreParaArchivo(tipo, campos))
}