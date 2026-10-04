<script setup>
defineProps({
    campos: { type: Object, required: true },
    listaGrados: { type: Array, default: () => [] },
})
</script>

<template>
    <div class="mb-3">
        <label class="form-label">Grado <span class="text-muted small">(opcional)</span></label>
        <select class="form-select" v-model="campos.grado_docente">
            <option value="">Selecciona...</option>
            <option v-for="g in listaGrados" :key="g.id" :value="g.valor">{{ g.valor }}{{
                g.descripcion ? ' — ' + g.descripcion : '' }}</option>
        </select>
    </div>
    <div class="mb-3">
        <label class="form-label">Nombre del destinatario <span class="text-danger">*</span></label>
        <input type="text" class="form-control" v-model="campos.nombre_destinatario"
            placeholder="Nombre completo de a quién va dirigido">
    </div>
    <div class="mb-3">
        <label class="form-label">Puesto <span class="text-muted small">(opcional)</span></label>
        <input type="text" class="form-control" v-model="campos.puesto_destinatario"
            placeholder="Ej: DIRECTOR DEL DEPARTAMENTO DE...">
    </div>
    <div class="mb-3">
        <label class="form-label">Contenido del documento <span class="text-danger">*</span></label>
        <textarea class="form-control" rows="6" v-model="campos.texto_libre"
            placeholder="Escribe el contenido del documento..."></textarea>
    </div>
</template>
