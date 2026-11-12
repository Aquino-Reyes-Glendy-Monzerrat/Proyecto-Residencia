<script setup>
// Vista previa de la Constancia creditos tutoria
import { computed } from 'vue'
import { encabezadoDependenciaHTML, destinatarioHTML } from '@/utils/encabezadoOficio.js'

const props = defineProps({
    campos: { type: Object, required: true },
    cuerpo: { type: String, default: '' },
    oficio: { type: String, default: '' },
    asunto: { type: String, default: '' },
    destinatario: { type: Object, default: null },
    jefe: { type: Object, default: null },
    notaCcp: { type: String, default: '' },
    esActividad: { type: Boolean, default: false },
})

const encabezado = computed(() => encabezadoDependenciaHTML({
    oficio: props.oficio,
    fecha: props.campos.fecha_documento,
    asunto: props.asunto,
}))

const destinatario = computed(() => destinatarioHTML([
    [props.destinatario?.grado, props.destinatario?.nombre].filter(Boolean).join(' '),
    props.destinatario?.puesto,
]))


const nombreTutor = computed(() => props.campos.nombre_docente_constancia
    || (props.esActividad ? '[Docente responsable]' : '[Docente tutor]'))
    
    </script>

<template>
    <div>
        <div v-html="encabezado"></div>
        <div v-html="destinatario"></div>

        <div class="texto-cuerpo" v-html="cuerpo"></div>

        <table class="texto-firma" style="width:100%; margin-top:2rem; text-align:center; border-collapse:collapse;">
            <tr>
                <td style="width:50%;"><strong>{{ esActividad ? 'ATENTAMENTE' : 'Atentamente' }}</strong></td>
                <td style="width:50%;"><strong>{{ esActividad ? 'Vo. Bo.' : 'V. b.' }}</strong></td>
            </tr>
            <tr>
                <td style="height:60px;"></td>
                <td></td>
            </tr>
            <tr>
                <td style="padding:0 1rem;">
                    <div style="border-top:1px solid #000; padding-top:4px;"><strong>{{ nombreTutor }}</strong></div>
                </td>
                <td style="padding:0 1rem;">
                    <div style="border-top:1px solid #000; padding-top:4px;"><strong>{{ campos.nombre_jefe_depto }}</strong></div>
                </td>
            </tr>
            <tr>
                <td><strong>{{ esActividad ? 'DOCENTE RESPONSABLE' : 'DOCENTE' }}</strong></td>
                <td><strong>{{ jefe?.puesto }}</strong></td>
            </tr>
        </table>

        <div v-if="notaCcp" class="texto-ccp-wrapper">
            <span class="texto-ccp" v-html="notaCcp"></span>
        </div>
    </div>
</template>
