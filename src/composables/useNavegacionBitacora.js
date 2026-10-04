// Navegación desde las Bitácoras (Admin y Secretaria/Apoyo): abrir un
// documento (ojito) y crear el documento de una tarea.
import { useRouter } from 'vue-router'
import { rutaParaTarea } from '@/utils/tiposTarea.js'

export function useNavegacionBitacora() {
    const router = useRouter()

    function verDocumento(doc) {
        router.push(`/bitacorasecapo/ver/${doc.id}`)
    }

    // Abre el formulario que corresponde al tipo de la tarea.
    function irACrearDocumento(entrada) {
        const ruta = rutaParaTarea(entrada)
        if (!ruta) {
            alert(`No se encontró a qué formulario corresponde el tipo "${entrada.tipo}".`)
            return
        }
        router.push(ruta)
    }

    return { verDocumento, irACrearDocumento }
}