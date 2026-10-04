// Pantallas de catálogo (Destinatarios, Firmantes, Docentes, y los
// grados y opciones de C.c.p. de Catálogo): una lista y un formulario
// que sirve para agregar y para editar. Cada pantalla solo dice qué
// catálogo es y cómo es su formulario; esta parte (cargar, editar,
// cancelar, guardar y eliminar) es igual en todas.
import { ref, onMounted } from 'vue'

export function useCatalogo({
    api,                        // { listar, agregar, actualizar, eliminar } de api.js
    vacio,                      // () => formulario vacío
    desdeRegistro,              // (registro) => formulario con sus datos, para editar
    validar = () => '',         // (form) => mensaje si falta algo, o '' si está bien
    aDatos = (form) => form,    // (form) => lo que se guarda
    textoEliminar,              // (registro) => pregunta antes de eliminar
    errorGuardar = 'Error al guardar',
    ordenar = null,             // (a, b) => ... para ordenar la lista (opcional)
    alCargar = null,            // async () => ... datos extra de la pantalla (opcional)
    alCancelar = null,          // () => ... limpiar estado extra de la pantalla (opcional)
}) {
    const lista = ref([])
    const cargando = ref(true)
    const guardando = ref(false)
    const form = ref(vacio())
    const editandoId = ref(null) // null = agregando nuevo / con valor = editando ese

    async function cargar() {
        cargando.value = true
        const registros = await api.listar()
        lista.value = ordenar ? registros.sort(ordenar) : registros
        if (alCargar) await alCargar()
        cargando.value = false
    }

    onMounted(cargar)

    function editar(registro) {
        editandoId.value = registro.id
        form.value = desdeRegistro(registro)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function cancelarEdicion() {
        editandoId.value = null
        form.value = vacio()
        if (alCancelar) alCancelar()
    }

    async function guardar() {
        const falta = validar(form.value)
        if (falta) {
            alert(falta)
            return
        }
        guardando.value = true
        try {
            const datos = aDatos(form.value)
            if (editandoId.value) {
                await api.actualizar(editandoId.value, datos)
            } else {
                await api.agregar(datos)
            }
            await cargar()
            cancelarEdicion()
        } catch (e) {
            alert(errorGuardar)
        } finally {
            guardando.value = false
        }
    }

    async function eliminar(registro) {
        if (!confirm(textoEliminar(registro))) return
        await api.eliminar(registro.id)
        await cargar()
        if (editandoId.value === registro.id) cancelarEdicion()
    }

    return { lista, cargando, guardando, form, editandoId, cargar, editar, cancelarEdicion, guardar, eliminar }
}