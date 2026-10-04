// Reimprime desde la Bitácora un par de memos vinculados (vinculadoCon)
// en una sola hoja, mitad y mitad. No crea nada nuevo: usa el cuerpo
// que ya quedó guardado de cada uno. Lo usan Bitacora y BitacoraSecApo.
import { ref, nextTick } from 'vue'
import { getDocumentoPorId, getConfiguracion } from '@/services/api.js'
import { imprimirConTitulo, nombreParaArchivo } from '@/utils/folio.js'
import { estiloDe } from '@/utils/estiloDocumento.js'

export function useImprimirCombinado() {
    const comboImprimir = ref({ mostrando: false, htmlPrimero: '', htmlSegundo: '', estiloPrimero: null, estiloSegundo: null })

    async function imprimirCombinado(doc) {
        const otro = await getDocumentoPorId(doc.vinculadoCon)
        // el más viejo va arriba
        const [primero, segundo] = (doc.creadoEn || 0) <= (otro.creadoEn || 0) ? [doc, otro] : [otro, doc]
        // Cada mitad con su formato guardado; la configuración actual
        // solo se pide si alguno es un documento viejo sin formato.
        const config = primero.estilo && segundo.estilo ? null : await getConfiguracion()
        comboImprimir.value = {
            mostrando: true,
            htmlPrimero: primero.cuerpo,
            htmlSegundo: segundo.cuerpo,
            estiloPrimero: estiloDe(primero, config),
            estiloSegundo: estiloDe(segundo, config),
        }
        await nextTick()
        // nombre con los 2 folios, ej. memorandum-solventacion-faltas_084-085_NOMBRE
        const numeros = [primero.campos?.numero_oficio, segundo.campos?.numero_oficio].filter(Boolean).join('-')
        imprimirConTitulo(nombreParaArchivo(primero.tipo, { ...primero.campos, numero_oficio: numeros }))
        comboImprimir.value.mostrando = false
    }

    return { comboImprimir, imprimirCombinado }
}