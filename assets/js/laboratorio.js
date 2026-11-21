// Laboratorio SQL: PostgreSQL (PGlite, WebAssembly) corriendo en el navegador
// con el esquema y los datos reales del proyecto final.
const PGLITE = "https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.17/dist";
const MAX_FILAS = 500;

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const lab = $("#lab");
if (lab) iniciar();

async function iniciar() {
  const estado = $(".lab-estado", lab);
  const textoEstado = $("span:last-child", estado);
  const punto = $(".punto", estado);
  const editor = $("textarea", lab);
  const btnEncender = $("#lab-encender");
  const btnEjecutar = $("#lab-ejecutar");
  const btnReiniciar = $("#lab-reiniciar");
  const detalle = $(".lab-detalle", lab);
  const resultado = $(".lab-resultado", lab);
  const lista = $(".lab-lista", lab);
  const buscador = $("#lab-buscar");

  const [algebra, muestras] = await Promise.all([
    fetch("assets/data/algebra.json").then((r) => r.json()),
    fetch("assets/data/muestras.json").then((r) => r.json()),
  ]);

  let db = null, cargando = null, actual = null;

  // ---------- Lista de consultas ----------
  const items = [
    ...muestras.map((m, i) => ({ ...m, clave: "m-" + m.id, grupo: "Destacadas", n: String(i + 1).padStart(2, "0") })),
    ...algebra.map((q) => ({ ...q, clave: "q-" + q.n, grupo: "Álgebra relacional · 51", n: String(q.n).padStart(2, "0") })),
  ];

  function pintarLista(filtro = "") {
    const f = filtro.trim().toLowerCase();
    let html = "", grupo = "";
    items.filter((it) => !f || (it.titulo + " " + (it.algebra || "") + " " + it.sql).toLowerCase().includes(f))
      .forEach((it) => {
        if (it.grupo !== grupo) { grupo = it.grupo; html += `<li class="lab-grupo">${grupo}</li>`; }
        html += `<li><button type="button" data-clave="${it.clave}" ${actual && actual.clave === it.clave ? 'aria-current="true"' : ""}><span>${it.n}</span><span>${escaparHTML(it.titulo)}</span></button></li>`;
      });
    lista.innerHTML = html || `<li class="lab-vacio">Nada coincide con «${escaparHTML(filtro)}».</li>`;
  }
  pintarLista();
  buscador.addEventListener("input", () => pintarLista(buscador.value));
  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-clave]");
    if (b) elegir(items.find((it) => it.clave === b.dataset.clave), true);
  });

  function elegir(it, desplazar) {
    actual = it;
    editor.value = it.sql;
    let html = `<h3>${escaparHTML(it.titulo)}</h3>`;
    if (it.algebra) html += `<div class="algebra">${escaparHTML(it.algebra)}</div><p>Filas esperadas según el documento de álgebra: <strong>${it.esperadas}</strong></p>`;
    if (it.nota) html += `<p>${escaparHTML(it.nota)}</p>`;
    detalle.innerHTML = html;
    lista.querySelectorAll("button").forEach((b) => b.toggleAttribute("aria-current", b.dataset.clave === it.clave));
    lista.querySelectorAll("button[aria-current]").forEach((b) => b.setAttribute("aria-current", "true"));
    if (desplazar) history.replaceState(null, "", "#" + it.clave);
    if (desplazar && window.innerWidth < 980) editor.scrollIntoView({ behavior: "smooth", block: "center" });
    if (db) ejecutar();
  }

  // ---------- Encender la base ----------
  function ponerEstado(clase, texto) { punto.className = "punto " + clase; textoEstado.textContent = texto; }

  async function encender() {
    if (db) return db;
    if (cargando) return cargando;
    btnEncender.disabled = true;
    cargando = (async () => {
      try {
        ponerEstado("cargando", "Descargando PostgreSQL (unos 5 MB, solo la primera vez)…");
        const [{ PGlite }, { btree_gist }] = await Promise.all([
          import(`${PGLITE}/index.js`),
          import(`${PGLITE}/contrib/btree_gist.js`),
        ]);
        const nueva = new PGlite({ extensions: { btree_gist } });
        ponerEstado("cargando", "Creando las 12 tablas y cargando los datos de prueba…");
        const [ddl, seed] = await Promise.all([
          fetch("assets/sql/01_ddl_tablas.sql").then((r) => r.text()),
          fetch("assets/sql/02_seed_datos_realistas.sql").then((r) => r.text()),
        ]);
        await nueva.exec(ddl);
        await nueva.exec(seed);
        const v = await nueva.query("SELECT split_part(version(), ' ', 2) AS v");
        db = nueva;
        ponerEstado("listo", `PostgreSQL ${v.rows[0].v} corriendo en tu navegador`);
        btnEncender.hidden = true;
        btnReiniciar.hidden = false;
        await pintarTablas();
        return db;
      } catch (err) {
        ponerEstado("", "No se pudo cargar PostgreSQL. Revisa tu conexión e inténtalo de nuevo.");
        btnEncender.disabled = false;
        cargando = null;
        console.error(err);
        throw err;
      }
    })();
    return cargando;
  }

  async function pintarTablas() {
    const nombres = await db.query("SELECT tablename AS tabla FROM pg_tables WHERE schemaname = 'public' ORDER BY 1");
    const union = nombres.rows.map((t) => `SELECT '${t.tabla}' AS tabla, count(*)::int AS filas FROM ${t.tabla}`).join(" UNION ALL ");
    const r = await db.query(union + " ORDER BY 1");
    const ul = $("#lab-tablas");
    ul.innerHTML = r.rows.map((t) => `<li><button type="button" data-tabla="${t.tabla}"><span>${t.tabla}</span><span>${t.filas}</span></button></li>`).join("");
    $("#lab-tablas-titulo").hidden = false;
  }
  $("#lab-tablas").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tabla]");
    if (!b) return;
    actual = null;
    lista.querySelectorAll("button[aria-current]").forEach((x) => x.removeAttribute("aria-current"));
    detalle.innerHTML = `<h3>Tabla ${b.dataset.tabla}</h3><p>Las primeras filas de la tabla, tal como quedaron después del script de datos.</p>`;
    editor.value = `SELECT *\nFROM ${b.dataset.tabla}\nLIMIT 50;`;
    ejecutar();
  });

  // ---------- Ejecutar ----------
  async function ejecutar() {
    const sql = editor.value.trim();
    if (!sql) return;
    btnEjecutar.disabled = true;
    try {
      await encender();
      const t0 = performance.now();
      let resultados, error = null;
      try { resultados = await db.exec(sql); } catch (e) { error = e; }
      const ms = Math.round(performance.now() - t0);
      if (error) return pintarError(error, ms);
      const ultimo = [...resultados].reverse().find((r) => r.fields && r.fields.length) || resultados[resultados.length - 1];
      pintarResultado(ultimo, ms);
    } catch {
      /* el estado ya muestra el error de carga */
    } finally {
      btnEjecutar.disabled = false;
    }
  }

  function pintarResultado(r, ms) {
    const filas = r && r.rows ? r.rows : [];
    const campos = r && r.fields ? r.fields.map((f) => f.name) : [];
    let verif = "";
    if (actual && actual.algebra && editor.value.trim() === actual.sql.trim()) {
      verif = filas.length === actual.esperadas
        ? `<span class="ok">Coincide con el documento: ${actual.esperadas} filas</span>`
        : `<span class="mal">Esperaba ${actual.esperadas} filas y salieron ${filas.length}</span>`;
    } else if (actual && actual.error) {
      verif = `<span class="mal">Esta operación debía ser rechazada y no lo fue</span>`;
    }
    if (!campos.length) {
      resultado.innerHTML = `<div class="lab-resultado-cab"><span>Sentencia ejecutada · ${r && r.affectedRows != null ? r.affectedRows + " filas afectadas · " : ""}${ms} ms</span>${verif}</div>`;
      return;
    }
    if (!filas.length) {
      resultado.innerHTML = `<div class="lab-resultado-cab"><span>0 filas · ${ms} ms</span>${verif}</div><p class="lab-vacio">La consulta no devolvió filas.${actual && actual.id === "partida" ? " Todos los asientos cuadran: el debe es igual al haber." : ""}</p>`;
      return;
    }
    const mostrar = filas.slice(0, MAX_FILAS);
    const esNum = (v) => typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v));
    const fmt = (v) => {
      if (v === null || v === undefined) return { cls: "nulo", t: "null" };
      if (v instanceof Date) return { cls: "", t: v.toISOString().slice(0, 10) };
      if (typeof v === "boolean") return { cls: "", t: v ? "true" : "false" };
      if (esNum(v)) {
        const n = Number(v);
        return { cls: "num", t: Math.abs(n) >= 10000 ? n.toLocaleString("es-CO", { maximumFractionDigits: 2 }) : String(v) };
      }
      return { cls: "", t: String(v) };
    };
    const cuerpo = mostrar.map((f) => "<tr>" + campos.map((c) => { const x = fmt(f[c]); return `<td class="${x.cls}">${escaparHTML(x.t)}</td>`; }).join("") + "</tr>").join("");
    resultado.innerHTML = `
      <div class="lab-resultado-cab"><span>${filas.length} ${filas.length === 1 ? "fila" : "filas"} · ${ms} ms${filas.length > MAX_FILAS ? ` · se muestran ${MAX_FILAS}` : ""}</span>${verif}</div>
      <div class="tabla-envoltura"><table class="datos"><thead><tr>${campos.map((c) => `<th>${escaparHTML(c)}</th>`).join("")}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
  }

  function pintarError(e, ms) {
    const esperado = actual && actual.error && editor.value.trim() === actual.sql.trim();
    resultado.innerHTML = `
      <div class="lab-resultado-cab"><span>${ms} ms</span>${esperado ? '<span class="ok">La base rechazó el cambio, como debía</span>' : '<span class="mal">Error</span>'}</div>
      <div class="lab-error">${escaparHTML(e.message || String(e))}</div>`;
  }

  btnEncender.addEventListener("click", async () => { await encender().catch(() => {}); if (db) ejecutar(); });
  btnEjecutar.addEventListener("click", ejecutar);
  btnReiniciar.addEventListener("click", async () => {
    btnReiniciar.disabled = true;
    try { await db.close(); } catch { /* sin efecto */ }
    db = null; cargando = null;
    resultado.innerHTML = "";
    await encender().catch(() => {});
    btnReiniciar.disabled = false;
    if (db) ejecutar();
  });
  editor.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); ejecutar(); }
    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end"); }
  });

  // Consulta inicial (o la del enlace)
  const desdeHash = items.find((it) => "#" + it.clave === location.hash);
  elegir(desdeHash || items[0], false);
}
