// Fechas del sistema. Se manejan 3 formatos:
//   'AAAA-MM-DD'  → <input type="date">, campos de documentos y tareas
//   'D/M/AAAA'    → doc.fecha (fecha de creación, la pone api.js)
//   'DD/MM/AAAA'  → como se escribe la fecha dentro de los oficios

const dos = (n) => String(n).padStart(2, '0')

// Hoy en hora LOCAL como 'AAAA-MM-DD'. 
export function fechaHoy(fecha = new Date()) {
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

// 'AAAA-MM-DD' → 'DD/MM/AAAA', como va en los oficios.
export function fechaConBarras(fechaStr) {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr + 'T00:00:00')
    return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`
}

// Cualquiera de los 2 formatos guardados ('D/M/AAAA' o 'AAAA-MM-DD') →
// 'AAAA-MM-DD'. En ese formato las fechas se comparan como texto
// ('2026-09-27' < '2026-10-01'), que es lo que usan los filtros Desde/Hasta.
export function aFechaISO(fechaStr) {
    if (!fechaStr) return ''
    if (fechaStr.includes('/')) {
        const [d, m, y] = fechaStr.split('/')
        return `${y}-${dos(m)}-${dos(d)}`
    }
    return fechaStr.slice(0, 10)
}