// Recorrido interactivo del ejercicio 1 del taller de normalización:
// PROYECTO–EMPLEADO, de la tabla original a 3FN.
(() => {
  const raiz = document.getElementById("recorrido-normalizacion");
  if (!raiz) return;

  const original = [
    [1010, "ERP", 2010, "Sandra", "Ingeniero", 100000, 20],
    [1010, "ERP", 2020, "Claudia", "Analista", 50000, 10],
    [1010, "ERP", 2030, "Yamyle", "Programador", 20000, 10],
    [1020, "CRM", 2010, "Sandra", "Ingeniero", 100000, 10],
    [1020, "CRM", 2020, "Claudia", "Analista", 50000, 15],
    [1020, "CRM", 2030, "Yamile", "Programador", 20000, 20],
    [1030, "BI", 2010, "Sandra", "Ingeniero", 100000, 10],
    [1030, "BI", 2020, "Claudia", "Analista", 50000, 15],
    [1030, "BI", 2030, "Llamile", "Programador", 20000, 10],
    [1010, "ERP", 2040, "Andrea", "Ingeniero", 100000, 40],
  ];
  const cols = ["cod_proyecto", "nom_proyecto", "cod_empleado", "nom_empleado", "profesion", "vlr_hora", "hrs_asignadas"];
  const pesos = new Intl.NumberFormat("es-CO");

  const distintos = (filas, idx) => {
    const vistos = new Map();
    filas.forEach((f) => { const k = idx.map((i) => f[i]).join("|"); if (!vistos.has(k)) vistos.set(k, idx.map((i) => f[i])); });
    return [...vistos.values()];
  };

  // Celdas que repiten un hecho ya dicho en otra fila (redundancia visible)
  function repetidos(filas) {
    const marcas = filas.map(() => new Set());
    const grupos = [[0, [1]], [2, [3, 4, 5]], [4, [5]]];
    grupos.forEach(([clave, deps]) => {
      const vistos = new Set();
      filas.forEach((f, r) => {
        if (vistos.has(f[clave])) deps.forEach((c) => marcas[r].add(c));
        vistos.add(f[clave]);
      });
    });
    return marcas;
  }

  function tabla(nombre, encabezados, filas, opciones = {}) {
    const { pk = [], fk = [], marcas = null } = opciones;
    const th = encabezados.map((h, i) => {
      const cls = pk.includes(i) ? "pk" : fk.includes(i) ? "fk" : "";
      return `<th class="${cls}">${h}${pk.includes(i) ? " (PK)" : ""}${fk.includes(i) ? " (FK)" : ""}</th>`;
    }).join("");
    const tr = filas.map((f, r) => "<tr>" + f.map((v, c) => {
      const num = typeof v === "number";
      const cls = [num ? "num" : "", marcas && marcas[r].has(c) ? "repetido" : ""].join(" ").trim();
      const valor = num && v >= 1000 && c === encabezados.indexOf("vlr_hora") ? pesos.format(v) : v;
      return `<td class="${cls}">${valor}</td>`;
    }).join("") + "</tr>").join("");
    return `<div><h5>${nombre}</h5><div class="tabla-envoltura"><table class="datos"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div></div>`;
  }

  const pasos = [
    {
      titulo: "Tabla original",
      texto: `<p>Está en <strong>1FN</strong>: cada celda tiene un solo valor y la llave es <code>(cod_proyecto, cod_empleado)</code>. Pero repite hechos: «ERP» aparece cuatro veces y el valor de la hora de un ingeniero, tres. Las celdas en ámbar dicen algo que otra fila ya dijo.</p>
      <p>Y la anomalía ya ocurrió en los datos que nos dieron: la empleada 2030 aparece como <strong>Yamyle</strong>, <strong>Yamile</strong> y <strong>Llamile</strong>. Cuando un dato se guarda tres veces, termina escrito de tres maneras.</p>`,
      df: true,
      render: () => tabla("PROYECTO_EMPLEADO", cols, original, { pk: [0, 2], marcas: repetidos(original) }),
    },
    {
      titulo: "2FN",
      texto: `<p>Quito las <strong>dependencias parciales</strong>: lo que depende solo del proyecto va a <code>PROYECTO</code> y lo que depende solo del empleado va a <code>EMPLEADO</code>. En <code>ASIGNACION</code> queda únicamente lo que necesita la llave completa: las horas asignadas.</p>
      <p>Todavía queda un problema: <code>vlr_hora</code> depende de la profesión, no del empleado. Si sube la tarifa de los ingenieros hay que cambiar a Sandra y a Andrea.</p>`,
      render: () => {
        const emp = distintos(original, [2, 3, 4, 5]).map((f) => (f[0] === 2030 ? [2030, "Yamile", f[2], f[3]] : f));
        return [
          tabla("PROYECTO", ["cod_proyecto", "nom_proyecto"], distintos(original, [0, 1]), { pk: [0] }),
          tabla("EMPLEADO", ["cod_empleado", "nom_empleado", "profesion", "vlr_hora"], emp, { pk: [0], marcas: emp.map((f, r) => new Set(emp.slice(0, r).some((g) => g[2] === f[2]) ? [3] : [])) }),
          tabla("ASIGNACION", ["cod_proyecto", "cod_empleado", "hrs_asignadas"], original.map((f) => [f[0], f[2], f[6]]), { pk: [0, 1], fk: [] }),
        ].join("");
      },
    },
    {
      titulo: "3FN",
      texto: `<p>Quito la <strong>dependencia transitiva</strong> <code>profesion → vlr_hora</code>: la tarifa vive una sola vez en <code>PROFESION</code>. Ahora cada hecho del negocio está en un único lugar, no hay celdas repetidas y cambiar la tarifa de los ingenieros es actualizar una fila.</p>
      <p>Pasamos de una tabla de 70 celdas con redundancia a cuatro tablas sin ningún hecho repetido, y sin perder información: con un <code>JOIN</code> se reconstruye la tabla original.</p>`,
      render: () => {
        const emp = distintos(original, [2, 3, 4]).map((f) => (f[0] === 2030 ? [2030, "Yamile", f[2]] : f));
        return [
          tabla("PROYECTO", ["cod_proyecto", "nom_proyecto"], distintos(original, [0, 1]), { pk: [0] }),
          tabla("PROFESION", ["profesion", "vlr_hora"], distintos(original, [4, 5]), { pk: [0] }),
          tabla("EMPLEADO", ["cod_empleado", "nom_empleado", "profesion"], emp, { pk: [0], fk: [2] }),
          tabla("ASIGNACION", ["cod_proyecto", "cod_empleado", "hrs_asignadas"], original.map((f) => [f[0], f[2], f[6]]), { pk: [0, 1] }),
        ].join("");
      },
    },
  ];

  const botones = raiz.querySelector(".pasos");
  const texto = raiz.querySelector(".paso-texto");
  const tablas = raiz.querySelector(".paso-tablas");
  const dfs = raiz.querySelector(".paso-df");

  pasos.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = p.titulo;
    b.addEventListener("click", () => mostrar(i));
    botones.appendChild(b);
  });

  function mostrar(i) {
    [...botones.children].forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
    texto.innerHTML = pasos[i].texto;
    tablas.innerHTML = pasos[i].render();
    tablas.style.gridTemplateColumns = i === 0 ? "1fr" : "";
    dfs.hidden = !pasos[i].df;
  }
  mostrar(0);
})();
