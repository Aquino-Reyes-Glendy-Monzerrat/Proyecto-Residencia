export function useTextoDocumento() {
    const meses = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ];

    function fechaATexto(fechaStr) {
        if (!fechaStr) return "";
        const fecha = new Date(fechaStr + "T00:00:00");
        return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
    }

    function rangoFechasATexto(inicioStr, finStr) {
        if (!inicioStr || !finStr) return "";
        const inicio = new Date(inicioStr + "T00:00:00");
        const fin = new Date(finStr + "T00:00:00");
        if (inicioStr === finStr) return `el ${fechaATexto(inicioStr)}`;
        if (
            inicio.getMonth() === fin.getMonth() &&
            inicio.getFullYear() === fin.getFullYear()
        ) {
            return `del ${inicio.getDate()} al ${fin.getDate()} de ${meses[fin.getMonth()]} de ${fin.getFullYear()}`;
        }
        return `del ${inicio.getDate()} de ${meses[inicio.getMonth()]} al ${fin.getDate()} de ${meses[fin.getMonth()]} de ${fin.getFullYear()}`;
    }

    function mesAnioATexto(fechaStr) {
        if (!fechaStr) return "";
        const fecha = new Date(fechaStr + "T00:00:00");
        return `el mes de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
    }

    function horaATexto(horaStr) {
        if (!horaStr) return "";
        const [h, m] = horaStr.split(":").map(Number);
        const periodo = h >= 12 ? "pm" : "am";
        let hora12 = h % 12;
        if (hora12 === 0) hora12 = 12;
        const minutos = String(m).padStart(2, "0");
        return `${hora12}:${minutos} ${periodo}`;
    }

    // Reemplaza {placeholders} en un texto usando un objeto de valores.
    // Reutilizable tanto en NuevoDocumento (con datos reales) como en
    // EditarPlantilla (con datos de ejemplo, para la vista previa).
    function renderPlantilla(cuerpo, valores) {
        if (!cuerpo) return "";
        let html = cuerpo;
        for (const [clave, valor] of Object.entries(valores)) {
            html = html.replaceAll(`{${clave}}`, valor ?? "");
        }
        return html;
    }

    // Calcula los placeholders derivados (fecha_texto, rango_fechas, etc.)
    // a partir de un objeto de campos crudos — reutilizable en NuevoDocumento
    // y en la vista previa del editor de plantillas.
    function construirVariablesDerivadas(campos) {
        const horarioTexto =
            campos.horario_inicio && campos.horario_fin
                ? `, en el horario de ${campos.horario_inicio} a ${campos.horario_fin} hrs`
                : "";

        return {
            fecha_texto: fechaATexto(campos.fecha),
            rango_fechas: rangoFechasATexto(campos.fecha_inicio, campos.fecha_fin),
            fecha_inicio_texto: fechaATexto(campos.fecha_inicio),
            fecha_fin_texto: fechaATexto(campos.fecha_fin),
            fecha_egreso_texto: fechaATexto(campos.fecha_egreso),
            fecha_egreso_mes_texto: mesAnioATexto(campos.fecha_egreso),
            hora_salida_texto: horaATexto(campos.hora_salida),
            horario_texto: horarioTexto,
            nombre_docente_completo:
                `${campos.grado_docente || ""} ${campos.nombre_destinatario || ""}`.trim(),
        };
    }

    return {
        fechaATexto,
        rangoFechasATexto,
        mesAnioATexto,
        horaATexto,
        renderPlantilla,
        construirVariablesDerivadas,
    };
}
