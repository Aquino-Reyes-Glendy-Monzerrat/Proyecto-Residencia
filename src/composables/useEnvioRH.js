
import { ref } from 'vue'
import { useFirmasDocumento } from './useFirmasDocumento.js'
import { enviarDocumentoARH } from '@/services/api.js'
import { TIPO_OFICIO_COMPACTACION } from '@/utils/oficioCompactacion.js'

// cuando el Oficio de compactacion tenga  firma se quita de aqui
const SIN_FIRMA_TODAVIA = [TIPO_OFICIO_COMPACTACION]

export function useEnvioRH() {
    const subtipo = ref('')
    const campos = ref({})
    const { firmarYSubirDocumentoEspecial } = useFirmasDocumento({
        tipo: 'memorandum',
        subtipo,
        campos,
        listaFirmantes: ref([]),
        listaDocentes: ref([]),
    })

    async function firmarYEnviarARH(doc) {
        if (!SIN_FIRMA_TODAVIA.includes(doc.tipo)) {
            subtipo.value = doc.tipo
            campos.value = doc.campos || {}
            await firmarYSubirDocumentoEspecial(doc.id, doc.cuerpo)
        }
        await enviarDocumentoARH(doc.id)
    }

    return { firmarYEnviarARH }
}
