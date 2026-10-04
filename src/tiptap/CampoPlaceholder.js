// Define la "pastilla" de TipTap que representa un {placeholder} —
// se ve y se arrastra como una sola pieza, nunca se edita letra por
// letra. Trae también las 2 funciones que convierten entre el texto
// con {llaves} (lo que se guarda, igual que siempre) y el HTML que
// entiende el editor (solo mientras se está editando).
import { Node, mergeAttributes } from "@tiptap/core";
import { NOMBRES_CAMPOS } from "../utils/nombresPlaceholders.js";

export const CampoPlaceholder = Node.create({
    name: "campoPlaceholder",
    group: "inline",
    inline: true,
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            campo: { default: null },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-campo]",
                getAttrs: (el) => ({ campo: el.getAttribute("data-campo") }),
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        const nombre = NOMBRES_CAMPOS[node.attrs.campo] || node.attrs.campo;
        return [
            "span",
            mergeAttributes(HTMLAttributes, {
                "data-campo": node.attrs.campo,
                "data-label": nombre,
                class: "chip-campo",
            }),
        ];
    },
});

// Texto guardado (con {llaves}) → HTML que TipTap puede mostrar.
export function textoARaw(cuerpo) {
    return (cuerpo || "").replace(
        /\{(\w+)\}/g,
        (_, campo) => `<span data-campo="${campo}"></span>`,
    );
}

// HTML del editor → texto con {llaves}, igual al formato de siempre.
export function rawATexto(html) {
    const contenedor = document.createElement("div");
    contenedor.innerHTML = html;
    contenedor.querySelectorAll("span[data-campo]").forEach((span) => {
        span.replaceWith(`{${span.dataset.campo}}`);
    });
    return contenedor.innerHTML;
}
