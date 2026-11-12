<script setup>
const varios = defineModel({ type: Boolean, default: false })
</script>

<template>
    <div class="mb-3">
        <label class="form-label">¿Para cuántos docentes?</label>
        <div class="btn-group w-100" role="group">
            <button type="button" class="btn" :class="!varios ? 'btn-primary' : 'btn-outline-primary'"
                @click="varios = false">
                <i class="bi bi-person me-1"></i>Un docente
            </button>
            <button type="button" class="btn" :class="varios ? 'btn-primary' : 'btn-outline-primary'"
                @click="varios = true">
                <i class="bi bi-people me-1"></i>Varios docentes
            </button>
        </div>
    </div>
</template>
