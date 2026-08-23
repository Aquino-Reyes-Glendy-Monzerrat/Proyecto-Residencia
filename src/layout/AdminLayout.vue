<script setup>
import { onMounted } from 'vue'
import AdminSidebar from '../components/AdminSidebar.vue'
import AdminNavbar from '../components/AdminNavbar.vue'
import { usePlantilla } from '../composables/usePlantilla'

const { initPlantilla } = usePlantilla()

onMounted(() => {
    initPlantilla()
})
</script>

<template>
    <div class="admin-shell">
        <AdminSidebar />
        <div class="admin-main">
            <AdminNavbar />
            <main class="dashboard-content">
                <div class="container-fluid px-3 px-lg-4 py-4">
                    <slot />
                </div>
            </main>
        </div>
    </div>
</template>