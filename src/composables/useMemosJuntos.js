// Cuando un memorándum de Solventación de Faltas cubre 2 incidencias
// del mismo maestro, se guardan como 2 documentos reales e
// independientes (cada uno con su propio folio), ligados entre sí con
// "vinculadoCon" — nunca se guarda un documento fusionado. La
// combinación (mitad y mitad en una hoja) se arma solo al imprimir.
import { ref, computed } from "vue";
import { useFolio } from "./UseFolio.js";
import { agregarDocumento, actualizarDocumento } from "../services/api.js";
import { formatearFolio, camposDeFolio } from "@/utils/folio.js";
import { fechaHoy } from "@/utils/fechas.js";

export function useMemosJuntos(
    categoriaFolio,
    config,
    folioSeleccionadoPrimero,
) {
    const combinarIncidencias = ref(false);
    const motivo2 = ref("");
    const fecha2 = ref(fechaHoy());

    // tipo (catalogo, opcional) y fecha de la  incidencia 2.
    const tipo2 = ref("");
    const fechaIncidencia2 = ref("");

    const {
        folioSeleccionado: folioSeleccionado2,
        mostrarReservados: mostrarReservados2,
        folioMostradoTexto: folioMostradoTexto2Base,
        reservadosConTexto: reservadosConTexto2Base,
        resolverNumeroFolio: resolverNumeroFolio2,
    } = useFolio(categoriaFolio, config);

    // Si las 2 incidencias son automáticas, la 2ª muestra el número
    // que le sigue a la 1ª — no es que "reserve" nada distinto, es
    // solo para no confundir mostrando el mismo número 2 veces (al
    // guardar, cada una consume su turno en orden, siempre correcto).
    const folioMostradoTexto2 = computed(() => {
        if (
            folioSeleccionado2.value !== "automatico" ||
            !config?.value ||
            !categoriaFolio?.value
        ) {
            return folioMostradoTexto2Base.value;
        }
        const cat = config.value.folio[categoriaFolio.value];
        const salto = folioSeleccionadoPrimero.value === "automatico" ? 2 : 1;
        const siguiente = (cat?.actual || 0) + salto;
        return formatearFolio(siguiente, config.value.folio.prefijo_default, config.value.folio.anio);
    });

    // Si ya se eligió un folio reservado para la 1ª incidencia, no
    // debe poder volver a elegirse para la 2ª.
    const reservadosConTexto2 = computed(() =>
        reservadosConTexto2Base.value.filter(
            (f) => f.numero !== folioSeleccionadoPrimero.value,
        ),
    );

    // Guarda el segundo documento (completo e independiente, mismo
    // formato que cualquier memo normal) y liga los 2 entre sí. Recibe
    // el número de folio y el HTML ya resueltos/capturados — no hace
    // ninguno de los 2 por su cuenta.
    async function guardarSegundoYVincular(
        primerDocumentoId,
        datosBase,
        htmlSegundo,
        folio2,
    ) {
        const creado = await agregarDocumento({
            ...datosBase,
            cuerpo: htmlSegundo,
            campos: {
                ...datosBase.campos,
                motivo: motivo2.value,
                tipo_incidencia: tipo2.value,
                fecha_incidencia: fechaIncidencia2.value,
                fecha_documento: fecha2.value,
                ...camposDeFolio(folio2),
            },
            vinculadoCon: primerDocumentoId,
        });
        await actualizarDocumento(primerDocumentoId, { vinculadoCon: creado.id });
        return creado.id;
    }

    function limpiarCombo() {
        combinarIncidencias.value = false;
        motivo2.value = "";
        tipo2.value = "";
        fechaIncidencia2.value = "";
        fecha2.value = fechaHoy();
        folioSeleccionado2.value = "automatico";
        mostrarReservados2.value = false;
    }

    return {
        combinarIncidencias,
        motivo2,
        fecha2,
        tipo2,
        fechaIncidencia2,
        folioSeleccionado2,
        mostrarReservados2,
        folioMostradoTexto2,
        reservadosConTexto2,
        resolverNumeroFolio2,
        guardarSegundoYVincular,
        limpiarCombo,
    };
}
