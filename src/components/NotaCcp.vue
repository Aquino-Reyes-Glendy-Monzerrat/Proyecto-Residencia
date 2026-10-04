<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCcpOpciones } from '@/services/api.js'

const props = defineProps(['destinos', 'iniciales', 'personas'])
const emit = defineEmits(['update:destinos', 'update:iniciales'])

// Destinos vienen de la BD  se pueden agregar/quitar desde catalogos 
const opciones = ref([])
onMounted(async () => {
    opciones.value = await getCcpOpciones()
})

const destinosSeleccionados = computed(() => props.destinos || [])

function destinoMarcado(opcion) {
    return destinosSeleccionados.value.includes(opcion.etiqueta)
}

function toggleDestino(opcion, checked) {
    let actuales = destinosSeleccionados.value.slice()
    if (checked) {
        if (!actuales.includes(opcion.etiqueta)) actuales.push(opcion.etiqueta)
    } else {
        actuales = actuales.filter(d => d !== opcion.etiqueta)
    }
    emit('update:destinos', actuales)
}

// Solo aplica si se pasa "personas" (checkboxes de quién captura,
// ej. Comisión). "iniciales" sigue siendo un solo string separado
// por "/" — aquí se arma/desarma según qué personas están marcadas.
const inicialesSeleccionadas = computed(() => {
    if (!props.iniciales) return []
    return props.iniciales.split('/').map(s => s.trim()).filter(Boolean)
})

function estaSeleccionada(persona) {
    return inicialesSeleccionadas.value.includes(persona.iniciales)
}

function toggleSeleccion(persona, checked) {
    let actuales = inicialesSeleccionadas.value.slice()
    if (checked) {
        if (!actuales.includes(persona.iniciales)) actuales.push(persona.iniciales)
    } else {
        actuales = actuales.filter(i => i !== persona.iniciales)
    }
    emit('update:iniciales', actuales.join('/'))
}
</script>

<template>
    <div class="mb-3 border rounded p-3">
        <label class="form-label fw-semibold">Nota de copia (ccp) <span class="text-muted small">(opcional)</span></label>

        <div class="form-check" v-for="opcion in opciones" :key="opcion.id">
            <input class="form-check-input" type="checkbox" :checked="destinoMarcado(opcion)"
                @change="toggleDestino(opcion, $event.target.checked)">
            <label class="form-check-label">{{ opcion.etiqueta }}</label>
        </div>

        <!-- qien captura: checkboxes de personas si se paso la lista (ej. comi) -->
        <!-- <div class="mt-2" v-if="personas && personas.length">
            <label class="form-label small">Captura</label>
            <div class="form-check" v-for="persona in personas" :key="persona.id">
                <input class="form-check-input" type="checkbox" :checked="estaSeleccionada(persona)"
                    @change="toggleSeleccion(persona, $event.target.checked)">
                <label class="form-check-label">{{ persona.etiqueta }} ({{ persona.iniciales }})</label>
            </div>
        </div> -->

        <!-- Si no se pasan personas, se queda el texto pred -->
        <!-- <div class="mt-2" v-else>
            <label class="form-label small">Iniciales (opcional)</label>
            <input type="text" class="form-control form-control-sm" :value="iniciales"
                @input="$emit('update:iniciales', $event.target.value)"
                placeholder="Ej: MANM/MAZE/Lgop*">
        </div> -->
    </div>
</template>