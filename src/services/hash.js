const CLAVE_SECRETA = 'MI_CLAVE_SECRETA_2026_FIRMA'

function bufferAHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export async function generarHashSHA256(texto) {
    const encoder = new TextEncoder()
    const datos = encoder.encode(texto)

    const hashBuffer = await crypto.subtle.digest('SHA-256', datos)
    return bufferAHex(hashBuffer)
}

export async function generarHashFirma(nombreCompleto) {
    return await generarHashSHA256(nombreCompleto + CLAVE_SECRETA)
}

export async function generarIdentificadorFirma(hashBase,documentoId,idUsuario,numeroPagina,fechaHora) {
    const cadena = hashBase + documentoId + idUsuario + numeroPagina + fechaHora + CLAVE_SECRETA
    const hashCompleto = await generarHashSHA256(cadena)
    return hashCompleto.substring(0, 8)
}