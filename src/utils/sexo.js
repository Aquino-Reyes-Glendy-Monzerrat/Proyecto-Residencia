export function textoSegunSexo(sexo, masculino, femenino, generico) {
    if (sexo === 'M') return masculino
    if (sexo === 'F') return femenino
    return generico
}