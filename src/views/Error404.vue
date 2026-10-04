<template>
    <main class="error-page">
        <section class="error-card">


            <div class="error-code">404</div>
            <h1 class="h3 mb-2">Página no encontrada</h1>
            <p class="text-muted mb-4">La página que buscas no existe o ha sido removida</p>
            <div class="d-flex flex-wrap justify-content-center gap-2">
                <a class="btn btn-primary" @click="$router.back()">
                    <i aria-hidden="true"></i> Regresar</a>
            </div>
        </section>
    </main>
</template>