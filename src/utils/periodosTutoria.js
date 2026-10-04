// Periodos de tutoría y cómo avanzan los grupos de un periodo al
// siguiente. Un periodo se identifica por periodo + año
// ("AGO-DIC" 2026), porque cada año se repiten los mismos 2 periodos
// con grupos y oficios distintos.

export const PERIODOS = {
    'ENE-JUN': { label: 'Enero - Junio', semestres: [2, 4, 6, 8] },
    'AGO-DIC': { label: 'Agosto - Diciembre', semestres: [1, 3, 5, 7, 9] },
}

export const ULTIMO_SEMESTRE = 9

export function claveGrupo(carrera, semestre, letra) {
    return `${carrera}${semestre}${letra}`.toUpperCase()
}


// Orden oficial de los grupos: por carrera, luego semestre, luego letra
// (I1A, I1B, I3A, ..., K1A, ...). Para .sort(compararGrupos).
export function compararGrupos(a, b) {
    if (a.carrera !== b.carrera) return a.carrera.localeCompare(b.carrera)
    if (a.semestre !== b.semestre) return a.semestre - b.semestre
    return a.letra.localeCompare(b.letra)
}


// Periodo en el que cae una fecha (enero a junio, o julio en adelante).
export function periodoDeFecha(fecha = new Date()) {
    return { periodo: fecha.getMonth() < 6 ? 'ENE-JUN' : 'AGO-DIC', anio: fecha.getFullYear() }
}

// Periodo guardado en la dirección de la página (?periodo=...&anio=...),
// o null si no viene o no es válido.
export function periodoDeQuery(query) {
    const anio = Number(query?.anio)
    return PERIODOS[query?.periodo] && Number.isInteger(anio) && anio > 2000
        ? { periodo: query.periodo, anio }
        : null
}

// AGO-DIC 2026 -> ENE-JUN 2027 -> AGO-DIC 2027 -> ...
export function siguientePeriodo({ periodo, anio }) {
    return periodo === 'AGO-DIC'
        ? { periodo: 'ENE-JUN', anio: Number(anio) + 1 }
        : { periodo: 'AGO-DIC', anio: Number(anio) }
}

// "Agosto - Diciembre de 2026"
export function etiquetaPeriodo(periodo, anio) {
    return `${PERIODOS[periodo]?.label || periodo} de ${anio}`
}

// ¿Un grupo u oficio pertenece al periodo elegido? Los guardados antes
// de que existiera el año (sin dato) cuentan como de anioSinDato.
export function esDelPeriodo(periodoRegistro, anioRegistro, { periodo, anio }, anioSinDato) {
    return periodoRegistro === periodo && Number(anioRegistro ?? anioSinDato) === Number(anio)
}

// Los grupos que tendrá el siguiente periodo, listos para guardarse:
// cada grupo sube un semestre con sus MISMOS tutores (se pueden cambiar
// después) y los de 9º ya no pasan. Al pasar a AGO-DIC entra una
// generación nueva: sus grupos de 1º se crean sin tutor, con las mismas
// carreras y letras que tuvo la generación anterior (los de 2º).
export function gruposDelSiguientePeriodo(gruposActuales, destino) {
    const nuevo = (carrera, semestre, letra, docenteIds) => ({
        clave: claveGrupo(carrera, semestre, letra),
        carrera,
        semestre,
        letra,
        periodo: destino.periodo,
        anio: destino.anio,
        docenteIds,
    })

    const suben = gruposActuales
        .filter(g => g.semestre < ULTIMO_SEMESTRE)
        .map(g => nuevo(g.carrera, g.semestre + 1, g.letra, [...(g.docenteIds || [])]))

    const primerSemestre = destino.periodo === 'AGO-DIC'
        ? gruposActuales.filter(g => g.semestre === 2).map(g => nuevo(g.carrera, 1, g.letra, []))
        : []

    return [...primerSemestre, ...suben]
}