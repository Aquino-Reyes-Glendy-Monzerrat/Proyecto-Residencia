// Nombre oficial de cada carrera según la letra de sus grupos
// (I3A, K2U, W5A...). Es como se escribe dentro de los oficios.
export const NOMBRE_OFICIAL_CARRERA = {
    I: 'Ingeniería en Sistemas Computacionales',
    K: 'Ingeniería en Tecnologías de la Información y Comunicaciones',
    W: 'Ingeniería en Desarrollo de Aplicaciones',
}

export function nombreCarrera(letra) {
    return NOMBRE_OFICIAL_CARRERA[letra] || letra || ''
}

// ['A', 'B', 'C'] → 'A, B y C'
export function unirConY(items) {
    if (items.length <= 1) return items.join('')
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

// Para el oficio de Tutorías: agrupa los grupos de un docente por
// carrera. Grupo en negrita y subrayado, carrera en mayúsculas.
//   1 grupo:  del grupo K2U de la carrera INGENIERÍA EN TECNOLOGÍAS...
//   varios:   de los grupos I3A y I5A de la carrera INGENIERÍA EN SISTEMAS...
//             y del grupo K2U de la carrera INGENIERÍA EN TECNOLOGÍAS...
export function gruposConCarreraTexto(grupos) {
    const porCarrera = {}
    grupos.forEach(g => {
        if (!porCarrera[g.carrera]) porCarrera[g.carrera] = []
        porCarrera[g.carrera].push(g.clave)
    })
    const partes = Object.entries(porCarrera).map(([carrera, claves]) => {
        const lista = unirConY(claves.map(c => `<strong><u>${c}</u></strong>`))
        const articulo = claves.length === 1 ? 'del grupo' : 'de los grupos'
        return `${articulo} ${lista} de la carrera <strong>${nombreCarrera(carrera).toUpperCase()}</strong>`
    })
    return unirConY(partes)
}