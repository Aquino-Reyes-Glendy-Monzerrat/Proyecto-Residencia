
import { escaparHTML } from './html.js'
//   oficial: como se escribe dentro de los oficios.
//   nombre, siglas, color: para la pantalla de Tutorías.
export const CARRERAS = {
    I: { oficial: 'Ingeniería en Sistemas Computacionales', nombre: 'Ing. en Sistemas Computacionales', siglas: 'ISIC', color: 'hsl(173 100% 65%)' },
    K: { oficial: 'Ingeniería en Tecnologías de la Información y Comunicaciones', nombre: 'Ing. en Tecnologías de la Información y Comunicaciones', siglas: 'ITIC', color: 'hsl(213 94% 78%)' },
    W: { oficial: 'Ingeniería en Desarrollo de Aplicaciones', nombre: 'Ing. en Desarrollo de Aplicaciones', siglas: 'IDAP', color: 'hsl(0 91% 82%)' },
}

export function nombreCarrera(letra) {
    return CARRERAS[letra]?.oficial || letra || ''
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
        const lista = unirConY(claves.map(c => `<strong><u>${escaparHTML(c)}</u></strong>`))
        const articulo = claves.length === 1 ? 'del grupo' : 'de los grupos'
        return `${articulo} ${lista} de la carrera <strong>${nombreCarrera(carrera).toUpperCase()}</strong>`
    })
    return unirConY(partes)
}