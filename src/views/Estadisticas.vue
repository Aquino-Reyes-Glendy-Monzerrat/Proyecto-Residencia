<script setup>

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '../layout/AdminLayout.vue'
import EstadisticasInasistencias from '@/components/estadisticas/EstadisticasInasistencias.vue'
import EstadisticasCreditos from '@/components/estadisticas/EstadisticasCreditos.vue'
import EstadisticasComisiones from '@/components/estadisticas/EstadisticasComisiones.vue'
import { getDocumentos, getDocentes, getTiposIncidencia, getActividadesComplementarias } from '@/services/api.js'
import {
    TIPO_COMISION_EXTERNA, TIPO_COMISION_INTERNA, comoLista, crearBuscadorDocentes, inasistenciasDe,
    comisionesFirmadasDe, constanciasDe, opcionesDocentes,
} from '@/utils/estadisticas.js'

const PESTANAS = [
    { valor: 'inasistencias', etiqueta: 'Inasistencias', componente: EstadisticasInasistencias },
    { valor: 'creditos', etiqueta: 'Créditos complementarios', componente: EstadisticasCreditos },
    { valor: 'comisiones', etiqueta: 'Comisiones', componente: EstadisticasComisiones },
]

const route = useRoute()
const router = useRouter()


const pestana = computed(() => {
    const tab = [].concat(route.query.tab ?? [])[0]
    return PESTANAS.find(p => p.valor === tab) ?? PESTANAS[0]
})

function abrirPestana(valor) {
    router.replace({ query: { ...route.query, tab: valor } })
}

const cargando = ref(true)
const error = ref('')
const documentos = ref([])
const docentes = ref([])
const tiposIncidencia = ref([])
const actividades = ref([])

const nombresDeCatalogo = (respuesta) => comoLista(respuesta).map(x => x?.valor).filter(Boolean)

async function cargar() {
    cargando.value = true
    error.value = ''
    try {
        const [docs, listaDocentes, tipos, acts] = await Promise.all([
            getDocumentos(), getDocentes(), getTiposIncidencia(), getActividadesComplementarias(),
        ])
        documentos.value = comoLista(docs)
        docentes.value = comoLista(listaDocentes)
        tiposIncidencia.value = nombresDeCatalogo(tipos)
        actividades.value = nombresDeCatalogo(acts)
    } catch (e) {
        console.error('No se pudieron cargar las estadísticas', e)
        error.value = 'No se pudieron cargar los datos. Revisa la conexión e intenta de nuevo.'
    } finally {
        cargando.value = false
    }
}
onMounted(cargar)

const buscarDocente = computed(() => crearBuscadorDocentes(docentes.value))
const inasistencias = computed(() => inasistenciasDe(documentos.value, buscarDocente.value))
const comisionesExternas = computed(() => comisionesFirmadasDe(documentos.value, TIPO_COMISION_EXTERNA, buscarDocente.value))
const comisionesInternas = computed(() => comisionesFirmadasDe(documentos.value, TIPO_COMISION_INTERNA, buscarDocente.value))
const constancias = computed(() => constanciasDe(documentos.value, buscarDocente.value))
const opcionesMaestros = computed(() => opcionesDocentes(docentes.value,
    inasistencias.value, comisionesExternas.value, comisionesInternas.value, constancias.value))

// lo que recibe cada pestaña
const datosDePestana = computed(() => ({
    inasistencias: { inasistencias: inasistencias.value, tiposCatalogo: tiposIncidencia.value },
    creditos: { constancias: constancias.value, actividadesCatalogo: actividades.value },
    comisiones: { externas: comisionesExternas.value, internas: comisionesInternas.value },
})[pestana.value.valor])
</script>

<template>
    <AdminLayout>

        <nav class="pestanas-estadisticas mb-0" aria-label="Secciones de estadísticas">
            <button v-for="p in PESTANAS" :key="p.valor" type="button" class="pestana"
                :class="{ activa: p === pestana }" :aria-current="p === pestana ? 'page' : null"
                @click="abrirPestana(p.valor)">{{ p.etiqueta }}</button>
        </nav>

        <div v-if="cargando" class="text-center py-5">
            <span class="spinner-border" role="status"></span>
        </div>

        <div v-else-if="error" class="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2"
            role="alert">
            {{ error }}
            <button type="button" class="btn btn-outline-danger btn-sm" @click="cargar">Reintentar</button>
        </div>

        <KeepAlive v-else>
            <component :is="pestana.componente" :key="pestana.valor" v-bind="datosDePestana"
            :opciones-maestros="opcionesMaestros" :total-docentes="docentes.length" />
        </KeepAlive>
    </AdminLayout>
</template>
