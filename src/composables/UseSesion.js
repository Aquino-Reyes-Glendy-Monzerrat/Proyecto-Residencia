// Sesion del usuario logueado, Centraliza la lectura de 'usuarioActivo'


export function useSesion() {
    // Lee y parsea al usuario guardado. Devuelve null si no hay sesión o
    // si el dato está corrupto, en vez de tronar con un JSON.parse crudo.
    function getUsuarioActivo() {
        try {
            return JSON.parse(localStorage.getItem('usuarioActivo')) || null
        } catch {
            return null
        }
    }

    const usuarioActivo = getUsuarioActivo()

    const esAdmin = usuarioActivo?.rol === 'admin'
    const esSecretaria = usuarioActivo?.rol === 'secretaria'
    const esApoyo = usuarioActivo?.rol === 'apoyo'

    // Guarda la sesión al iniciar (lo usa Bienvenida al hacer login).
    function guardarSesion(usuario) {
        localStorage.setItem('usuarioActivo', JSON.stringify(usuario))
    }

    // Cierra la sesión (para el botón de salir cuando se conecte).
    function cerrarSesion() {
        localStorage.removeItem('usuarioActivo')
    }

    return {
        usuarioActivo,
        esAdmin,
        esSecretaria,
        esApoyo,
        getUsuarioActivo,
        guardarSesion,
        cerrarSesion,
    }
}