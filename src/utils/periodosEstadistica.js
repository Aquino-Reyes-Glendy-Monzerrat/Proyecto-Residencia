
import { MESES, fechaHoy } from './fechas.js'

export const DIA_MS = 86400000


export const VISTAS = {
    anio: 'Año',
    semestre: 'Semestre',
    mes: 'Mes',
    semana: 'Semana',
    dia: 'Día',
}


export const SEMESTRES = [
    { clave: 'ENE-JUN', etiqueta: 'Ene–Jun', meses: [0, 5] },
    { clave: 'AGO-DIC', etiqueta: 'Ago–Dic', meses: [7, 11] },
]

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)


export function diaDeISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

export function hoyDia() {
    return diaDeISO(fechaHoy())
}

export function partesDe(dia) {
    const f = new Date(dia)
    return { anio: f.getUTCFullYear(), mes: f.getUTCMonth(), dia: f.getUTCDate(), semana: f.getUTCDay() }
}

const esFinDeSemana = (dia) => new Date(dia).getUTCDay() % 6 === 0

export function lunesDe(dia) {
    return dia - ((new Date(dia).getUTCDay() + 6) % 7) * DIA_MS
}


export function ultimoDiaHabil(dia) {
    while (esFinDeSemana(dia)) dia -= DIA_MS
    return dia
}

export function semestreDe(dia) {
    const { anio, mes } = partesDe(dia)
    return { anio, semestre: mes <= 5 ? SEMESTRES[0] : SEMESTRES[1] }
}

export function nombreDelDia(dia) {
    const p = partesDe(dia)
    return `${mayuscula(DIAS[p.semana])} ${p.dia} de ${MESES[p.mes]}`
}

export function nombreDelMes(mes) {
    return mayuscula(MESES[mes])
}

function columnasDeMeses(anio, desde, hasta) {
    const cols = []
    for (let m = desde; m <= hasta; m++) {
        cols.push({ etiqueta: MESES_CORTOS[m], ini: Date.UTC(anio, m, 1), fin: Date.UTC(anio, m + 1, 1) })
    }
    return cols
}


export function periodoDe(vista, dia) {
    const p = partesDe(dia)
    let per

    if (vista === 'dia') {
        per = { sub: nombreDelDia(dia), cols: [{ etiqueta: 'Total', ini: dia, fin: dia + DIA_MS }] }
    } else if (vista === 'semana') {
        const lunes = lunesDe(dia)
        const cols = [0, 1, 2, 3, 4].map(k => {
            const d = lunes + k * DIA_MS
            return { etiqueta: `${DIAS_CORTOS[(k + 1) % 7]} ${partesDe(d).dia}`, ini: d, fin: d + DIA_MS }
        })
        const a = partesDe(lunes), b = partesDe(lunes + 4 * DIA_MS)
        const desde = a.mes === b.mes ? a.dia : `${a.dia} de ${MESES[a.mes]}`
        per = { sub: `Del ${desde} al ${b.dia} de ${MESES[b.mes]}`, cols, fin: lunes + 7 * DIA_MS }
    } else if (vista === 'mes') {
        const ultimo = partesDe(Date.UTC(p.anio, p.mes + 1, 1) - DIA_MS).dia
        const cols = []
        for (let i = 1; i <= ultimo; i += 7) {
            const j = Math.min(i + 6, ultimo)
            cols.push({ etiqueta: `${i}–${j}`, ini: Date.UTC(p.anio, p.mes, i), fin: Date.UTC(p.anio, p.mes, j + 1) })
        }
        per = { sub: nombreDelMes(p.mes), cols }
    } else if (vista === 'semestre') {
        const { semestre } = semestreDe(dia)
        per = {
            sub: semestre.etiqueta,
            cols: columnasDeMeses(p.anio, ...semestre.meses),
            semestres: [{ periodo: semestre.clave, anio: p.anio }],
        }
    } else {
        per = {
            sub: VISTAS.anio,
            cols: columnasDeMeses(p.anio, 0, 11),
            semestres: SEMESTRES.map(s => ({ periodo: s.clave, anio: p.anio })),
        }
    }

    per.etiqueta = vista === 'anio' ? String(p.anio) : `${per.sub} ${p.anio}`
    per.ini = per.cols[0].ini
    per.fin = per.fin ?? per.cols[per.cols.length - 1].fin
    per.semestres = per.semestres ?? []
    return per
}


export function moverPeriodo(vista, dia, paso) {
    const p = partesDe(dia)
    if (vista === 'dia') {
        do { dia += paso * DIA_MS } while (esFinDeSemana(dia))
        return dia
    }
    if (vista === 'semana') return dia + paso * 7 * DIA_MS
    if (vista === 'mes') return Date.UTC(p.anio, p.mes + paso, 1)
    if (vista === 'semestre') {
        const n = p.anio * 2 + (semestreDe(dia).semestre === SEMESTRES[0] ? 0 : 1) + paso
        return Date.UTC(Math.floor(n / 2), SEMESTRES[n % 2].meses[0], 1)
    }
    return Date.UTC(p.anio + paso, 0, 1)
}

export function empiezaEnElFuturo(vista, dia, hoy) {
    return periodoDe(vista, dia).ini > hoy
}


export function limitarDia(dia, vista, hoy) {
    if (dia > hoy) {
        const h = partesDe(hoy)
        dia = vista === 'mes' ? Date.UTC(h.anio, h.mes, 1) : hoy
    }
    return vista === 'dia' ? ultimoDiaHabil(dia) : dia
}


export function mismoDiaEnAnio(dia, anio, vista, hoy) {
    const p = partesDe(dia)
    const ultimo = partesDe(Date.UTC(anio, p.mes + 1, 1) - DIA_MS).dia
    return limitarDia(Date.UTC(anio, p.mes, Math.min(p.dia, ultimo)), vista, hoy)
}


export function semanasDelCalendario(anio, mes) {
    const inicio = lunesDe(Date.UTC(anio, mes, 1))
    return Array.from({ length: 6 }, (_, f) =>
        Array.from({ length: 7 }, (_, k) => inicio + (f * 7 + k) * DIA_MS))
}
