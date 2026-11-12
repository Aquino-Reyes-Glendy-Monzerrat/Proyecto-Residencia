// Partes del oficio que se repiten entre documentos: encabezado
// DEPENDENCIA/SECCIÓN, destinatario y c.c.p. Devuelven HTML para usarse
// igual en NuevoDocumento (con v-html) y en Tutorías (oficios en lote),
// así los dos se ven idénticos y se cambian en un solo lugar.
import { fechaConBarras } from '@/utils/fechas.js'
import { escaparHTML } from '@/utils/html.js'

export const CIUDAD_FECHA = 'Chetumal, Quintana Roo,'

export function encabezadoDependenciaHTML({ oficio, fecha, asunto }) {
    const fechaTexto = fecha ? fechaConBarras(fecha) : 'DD/MM/AAAA'
    const bloqueAsunto = asunto
        ? `<div class="mb-3 texto-asunto" style="display:flex; justify-content:flex-end; gap:0.3em;">
    <strong style="white-space:nowrap;">Asunto:</strong>
    <span style="text-align:left; max-width:60%;">${escaparHTML(asunto).replaceAll('\n', '<br>')}</span>
</div>`
        : ''
    return `<div class="text-end mb-3 texto-encabezado">
    <strong>DEPENDENCIA:</strong> SUBDIRECCIÓN ACADÉMICA<br>
    <strong>SECCIÓN:</strong> SISTEMAS Y COMPUTACIÓN<br>
    OFICIO No. ${oficio}<br><br>
    ${CIUDAD_FECHA} <span class="fecha-resaltada">${fechaTexto}</span>
</div>
${bloqueAsunto}`
}

// Nombre, puesto... y PRESENTE al final. Las líneas vacías se saltan.
// Los textos se escapan (vienen de catálogos y formularios).
export function destinatarioHTML(lineas, presente = 'PRESENTE') {
    const filas = [...lineas.filter(Boolean), presente].map(l => `<strong>${escaparHTML(l)}</strong>`)
    return `<div class="mb-3 texto-destinatario">${filas.join('<br>')}</div>`
}

// Líneas de la nota c.c.p.: "C.c.p. Archivo", "Minutario"… y las
// iniciales al final. '' si no hay nada. Escapadas.
export function lineasCcpHTML(destinos = [], iniciales = '') {
    const lineas = (destinos || []).map((d, i) => `${i === 0 ? 'C.c.p. ' : ''}${d}`)
    if (iniciales) lineas.push(iniciales)
    return lineas.map(l => `<div>${escaparHTML(l)}</div>`).join('')
}

// La nota c.c.p. completa, con su contenedor (Tutorías).
export function ccpHTML(destinos = []) {
    const lineas = lineasCcpHTML(destinos)
    return lineas ? `<div class="texto-ccp-wrapper"><span class="texto-ccp">${lineas}</span></div>` : ''
}