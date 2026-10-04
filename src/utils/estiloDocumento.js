// Formato visual de los documentos: fuente, tamaños de letra,
// interlineado y márgenes. style.css los lee como variables CSS
// (--fuente, --tamano-cuerpo, ...), cada una con un valor de respaldo.
//
// Cada documento guarda una "foto" del formato con el que se creó
// (doc.estilo), para que siempre se vea e imprima igual aunque el Admin
// cambie el formato después. Los documentos creados antes de esto no
// tienen foto y usan el formato actual de la configuración.

// [variable CSS, campo de config.estilo, unidad]
const VARIABLES = [
    ['--margen-superior', 'margen_superior', 'cm'],
    ['--margen-derecho', 'margen_derecho', 'cm'],
    ['--margen-inferior', 'margen_inferior', 'cm'],
    ['--margen-izquierdo', 'margen_izquierdo', 'cm'],
    ['--fuente', 'fuente', ''],
    ['--interlineado', 'interlineado', ''],
    ['--tamano-encabezado', 'tamano_encabezado', 'pt'],
    ['--tamano-asunto', 'tamano_asunto', 'pt'],
    ['--tamano-destinatario', 'tamano_destinatario', 'pt'],
    ['--tamano-cuerpo', 'tamano_cuerpo', 'pt'],
    ['--tamano-firma', 'tamano_firma', 'pt'],
    ['--tamano-ccp', 'tamano_ccp', 'pt'],
    ['--tamano-lema', 'tamano_lema', 'pt'],
    ['--tamano-lema-secundario', 'tamano_lema_secundario', 'pt'],
]

const tieneValor = (v) => v !== undefined && v !== null && v !== ''

// Las medidas admiten coma o puntoo
function valorCss(valor, unidad) {
    return unidad ? String(valor).replace(',', '.') + unidad : String(valor)
}

// Copia solo los campos de formato (sin logos ni otras opciones) para
// guardarla dentro del documento al crearlo.
export function fotoDeEstilo(estilo) {
    if (!estilo) return null
    return Object.fromEntries(
        VARIABLES.map(([, campo]) => [campo, estilo[campo]]).filter(([, valor]) => tieneValor(valor)),
    )
}

// El formato que le toca a un documento: el suyo, o el actual si es
// un documento viejo sin foto.
export function estiloDe(doc, config) {
    return doc?.estilo || config?.estilo || null
}

// Para :style="..." en el .documento-carta. Las variables aplican solo a
// ESE documento y no a toda la página: así varios documentos con
// formatos distintos se ven juntos, y recargar la página no las borra.
export function variablesDeEstilo(estilo) {
    if (!estilo) return {}
    const vars = {}
    for (const [variable, campo, unidad] of VARIABLES) {
        if (tieneValor(estilo[campo])) vars[variable] = valorCss(estilo[campo], unidad)
    }
    return vars
}