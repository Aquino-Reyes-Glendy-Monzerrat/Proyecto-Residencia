<script setup>
import { onMounted } from 'vue'
import { sincronizarHashes } from './services/api.js'

onMounted(async () => {
    

    try {
        const resultado = await sincronizarHashes()
    } catch (error) {
        console.error('ERROR AL SINCRONIZAR HASHES:', error)
        console.error('RESPUESTA DEL SERVIDOR:', error.response?.data)
        console.error('STATUS:', error.response?.status)
    }
})
</script>

<template>
    <RouterView />
</template>

<style></style>