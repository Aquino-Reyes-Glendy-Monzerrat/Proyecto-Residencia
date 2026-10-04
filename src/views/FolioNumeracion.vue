<script setup>
import AdminLayout from '../layout/AdminLayout.vue'
import ContadorFolio from '@/components/ContadorFolio.vue'
import { ref, onMounted } from 'vue'
import {
    getConfiguracion, actualizarConfiguracion,
    reservarFolios, reiniciarContadorFolio
} from '../services/api.js'

const config = ref(null)
const cargando = ref(true)
const guardando = ref(false)

//todos comparten cont solo memos separadsos
const CATEGORIAS = [
    { clave: 'general', titulo: 'Contador General', icono: 'bi-briefcase',
        descripcion: 'Comisión, Liberación de Proyecto, Aceptación/Terminación de Residencia y Servicio Social, Revisión de Tesis y Otros' },
    { clave: 'memorandums', titulo: 'Contador de Memorandums', icono: 'bi-file-text',
        descripcion: 'Solventación de Faltas y Compactación de Horario' },
]

const cantidadReservar = ref({ general: 1, memorandums: 1 })

onMounted(async () => {
    config.value = await getConfiguracion()
    
    for (const { clave } of CATEGORIAS) {
        if (!config.value.folio[clave]) config.value.folio[clave] = { actual: 0, reservados: [] }
    }
    cargando.value = false
})

async function recargar() {
    config.value = await getConfiguracion()
}

async function guardarGeneral() {
    guardando.value = true
    try {
        await actualizarConfiguracion(config.value)
        alert('Configuración general guardada correctamente')
    } catch (e) {
        alert('Error al guardar los cambios')
    } finally {
        guardando.value = false
    }
}

async function reservar(categoria) {
    const cantidad = cantidadReservar.value[categoria]
    if (!cantidad || cantidad < 1) {
        alert('Escribe cuántos folios quieres reservar (mínimo 1).')
        return
    }
    await reservarFolios(categoria, cantidad)
    await recargar()
}

async function reiniciar(categoria) {
    const nombre = CATEGORIAS.find(c => c.clave === categoria)?.titulo || categoria
    if (!confirm(`¿Reiniciar el contador de "${nombre}" a 0? Esto también borra sus folios reservados. Esta acción no se puede deshacer.`)) return
    await reiniciarContadorFolio(categoria)
    await recargar()
}
</script>

<template>
    <AdminLayout>
        <div class="container-fluid px-3 px-lg-4 py-0">

            <div v-if="cargando" class="text-center py-5">
                <span class="spinner-border"></span>
            </div>

            <template v-else>
                <div class="panel p-4 mb-4">
                    <div class="row g-3 align-items-end">
                        <div class="col-6 col-md-3">
                            <label class="form-label">Año</label>
                            <input type="number" class="form-control" v-model.number="config.folio.anio">
                        </div>
                        <div class="col-6 col-md-3">
                            <label class="form-label">Prefijo por defecto</label>
                            <input type="text" class="form-control" v-model="config.folio.prefijo_default">
                        </div>
                        <div class="col-12 col-md-3">
                            <button class="btn btn-primary" :disabled="guardando" @click="guardarGeneral">
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>

                <div class="row g-4">
                    <div v-for="cat in CATEGORIAS" :key="cat.clave" class="col-12 col-lg-6">
                        <p class="small text-muted mb-2">{{ cat.descripcion }}</p>
                        <ContadorFolio
                            :categoria="config.folio[cat.clave]"
                            :titulo="cat.titulo"
                            :icono="cat.icono"
                            :prefijo="config.folio.prefijo_default"
                            :anio="config.folio.anio"
                            v-model:cantidad-reservar="cantidadReservar[cat.clave]"
                            @reservar="reservar(cat.clave)"
                            @reiniciar="reiniciar(cat.clave)" />
                    </div>
                </div>
            </template>
        </div>
    </AdminLayout>
</template>