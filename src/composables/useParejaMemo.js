// Memos dobles (2 incidencias vinculadas con vinculadoCon) y cómo se
// nombra un documento en los mensajes. Lo comparten Bitacora y
// BitacoraSecApo: antes eran 2 copias iguales que había que mantener
// a mano.
//
// La revisión (aprobar, corregir, compartir, enviar) va en pareja
// porque se revisan en la misma hoja; cancelar y borrar son solo del
// que se presiona y los separan.
import { actualizarDocumento, actualizarBitacora } from '@/services/api.js'
import { folioRealDe as _folioRealDe, textoVinculado as _textoVinculado } from '@/utils/folio.js'

// Recibe los ref de la Bitácora que lo usa (los llena su cargarTodo).
export function useParejaMemo({ documentos, prefijoFolio, anioFolio, bitacoraPorDocumentoId }) {
    // "MEMORANDUM NO: P-084/2026" u "Oficio No. P-040/2026".
    function folioRealDe(doc) {
        return _folioRealDe(doc, prefijoFolio.value, anioFolio.value)
    }

    // Folio de su pareja, para "Vinculado con ..." (null si ya no tiene).
    function textoVinculado(doc) {
        return _textoVinculado(doc, documentos.value, prefijoFolio.value, anioFolio.value)
    }

    // Su pareja, si todavía existe (documentos trae todos, no solo los
    // del usuario).
    function pareja(doc) {
        return doc.vinculadoCon ? documentos.value.find(d => d.id === doc.vinculadoCon) || null : null
    }

    function conPareja(doc) {
        return [doc, pareja(doc)].filter(Boolean)
    }

    // Cómo se nombra en los mensajes: el folio real, nunca DOC-2026-XXX.
    function nombreDe(doc) {
        return folioRealDe(doc) || doc.folio
    }

    // El documento y su pareja: "MEMORANDUM NO: P-084/2026 y ...".
    function nombreEnMensaje(doc) {
        return conPareja(doc).map(nombreDe).join(' y ')
    }

    // Aviso para los mensajes de Cancelar/Borrar de un memo doble.
    function avisoSeparacion(doc) {
        const p = pareja(doc)
        return p ? ` ${nombreDe(p)} quedará como memorándum individual.` : ''
    }

    // Cancelar uno lo separa de su pareja: si siguieran ligados, corregir
    // el cancelado arrastraría al otro (que puede estar bien). La tarea
    // era de los 2 (aunque esté ligada a uno): se queda con el que sigue
    // activo, y el que se queda sin ella guarda quién la asignó, para que
    // la Secretaria tampoco pueda borrarlo.
    async function separarDePareja(doc) {
        const p = pareja(doc)
        if (!p) return
        const tarea = bitacoraPorDocumentoId.value[doc.id] || bitacoraPorDocumentoId.value[p.id]
        await actualizarDocumento(doc.id, { vinculadoCon: null, ...(tarea ? { tareaAsignadaPor: tarea.creadoPor } : {}) })
        await actualizarDocumento(p.id, { vinculadoCon: null })
        if (bitacoraPorDocumentoId.value[doc.id]) await actualizarBitacora(tarea.id, { documentoId: p.id })
    }

    return { folioRealDe, textoVinculado, pareja, conPareja, nombreDe, nombreEnMensaje, avisoSeparacion, separarDePareja }
}