// Partes del oficio que se repiten entre documentos: encabezado
// DEPENDENCIA/SECCIÓN, destinatario y c.c.p. Devuelven HTML para usarse
// igual en NuevoDocumento (con v-html) y en Tutorías (oficios en lote),
// así los dos se ven idénticos y se cambian en un solo lugar.
import { fechaConBarras } from '@/utils/fechas.js'

export const CIUDAD_FECHA = 'Chetumal, Quintana Roo,'

// DEPENDENCIA / SECCIÓN / OFICIO No. / fecha y, si hay, el Asunto.
export function encabezadoDependenciaHTML({ oficio, fecha, asunto }) {
    const fechaTexto = fecha ? fechaConBarras(fecha) : 'DD/MM/AAAA'
    const bloqueAsunto = asunto
        ? `<div class="mb-3 texto-asunto" style="text-align:right; margin-left:auto; max-width:60%;">
    <strong>Asunto:</strong> ${asunto}
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
export function destinatarioHTML(lineas, presente = 'PRESENTE') {
    const filas = [...lineas.filter(Boolean), presente].map(l => `<strong>${l}</strong>`)
    return `<div class="mb-3 texto-destinatario">${filas.join('<br>')}</div>`
}

// Mismo formato que la nota c.c.p. de NuevoDocumento.
export function ccpHTML(destinos = []) {
    if (!destinos?.length) return ''
    const lineas = destinos.map((d, i) => `<div>${i === 0 ? 'C.c.p. ' : ''}${d}</div>`).join('')
    return `<div class="texto-ccp-wrapper"><span class="texto-ccp">${lineas}</span></div>`
}