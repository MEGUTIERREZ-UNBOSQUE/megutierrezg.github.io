// Comportamiento común del sitio: menú móvil, pestañas, visor de diagramas,
// galería desplazable y resaltado de SQL. Sin dependencias.

document.addEventListener("DOMContentLoaded", () => {
  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();

  // ---------- Menú móvil ----------
  const botonMenu = document.querySelector(".boton-menu");
  const menu = document.getElementById("menu");
  if (botonMenu && menu) {
    botonMenu.addEventListener("click", () => {
      const abierto = menu.classList.toggle("abierto");
      botonMenu.setAttribute("aria-expanded", String(abierto));
    });
  }

  // ---------- Pestañas accesibles ----------
  document.querySelectorAll(".pestanas").forEach((grupo) => {
    const tabs = [...grupo.querySelectorAll('[role="tab"]')];
    const activar = (tab, foco) => {
      tabs.forEach((t) => {
        const sel = t === tab;
        t.setAttribute("aria-selected", String(sel));
        t.tabIndex = sel ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = true;
      });
      document.getElementById(tab.getAttribute("aria-controls")).hidden = false;
      if (foco) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => activar(tab));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") activar(tabs[(i + 1) % tabs.length], true);
        if (e.key === "ArrowLeft") activar(tabs[(i - 1 + tabs.length) % tabs.length], true);
      });
    });
    if (tabs.length) activar(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
  });

  // ---------- Visor de diagramas e imágenes ----------
  const visor = document.createElement("dialog");
  visor.className = "visor";
  visor.innerHTML = `
    <div class="visor-barra">
      <span class="visor-titulo"></span>
      <div>
        <button type="button" data-z="-1" aria-label="Alejar">−</button>
        <button type="button" data-z="0">Ajustar</button>
        <button type="button" data-z="1" aria-label="Acercar">+</button>
        <a class="visor-abrir" target="_blank" rel="noopener">Abrir aparte</a>
        <button type="button" class="visor-cerrar">Cerrar</button>
      </div>
    </div>
    <div class="visor-lienzo"><img alt=""></div>`;
  document.body.appendChild(visor);
  const vImg = visor.querySelector("img");
  const vLienzo = visor.querySelector(".visor-lienzo");
  let escala = 1, base = 1;
  const aplicar = () => { vImg.style.width = Math.round(vImg.naturalWidth * base * escala) + "px"; };
  const ajustar = () => {
    const w = vLienzo.clientWidth - 48, h = vLienzo.clientHeight - 88;
    base = Math.min(w / vImg.naturalWidth, h / vImg.naturalHeight, 2.5);
    escala = 1; aplicar();
  };
  vImg.addEventListener("load", ajustar);
  visor.querySelectorAll("[data-z]").forEach((b) =>
    b.addEventListener("click", () => {
      const z = Number(b.dataset.z);
      if (z === 0) return ajustar();
      escala = Math.min(6, Math.max(0.3, escala * (z > 0 ? 1.3 : 1 / 1.3)));
      aplicar();
    })
  );
  visor.querySelector(".visor-cerrar").addEventListener("click", () => visor.close());
  visor.addEventListener("click", (e) => { if (e.target === vLienzo) visor.close(); });
  document.addEventListener("click", (e) => {
    const disparador = e.target.closest("[data-visor]");
    if (!disparador) return;
    e.preventDefault();
    const src = disparador.dataset.visor;
    visor.querySelector(".visor-titulo").textContent = disparador.dataset.titulo || "";
    visor.querySelector(".visor-abrir").href = src;
    vImg.alt = disparador.dataset.titulo || "Diagrama ampliado";
    vImg.src = src;
    visor.showModal();
    if (vImg.complete && vImg.naturalWidth) ajustar();
  });

  // ---------- Galería con flechas ----------
  document.querySelectorAll("[data-galeria]").forEach((nav) => {
    const pista = document.getElementById(nav.dataset.galeria);
    nav.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        pista.scrollBy({ left: (b.dataset.dir === "1" ? 1 : -1) * pista.clientWidth * 0.8, behavior: "smooth" });
      })
    );
  });

  // ---------- Resaltado de SQL ----------
  document.querySelectorAll("pre.sql code").forEach((c) => { c.innerHTML = resaltarSQL(c.textContent); });
});

const PALABRAS = "SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|ORDER|BY|GROUP|HAVING|JOIN|LEFT|RIGHT|FULL|OUTER|INNER|CROSS|ON|AS|DISTINCT|UNION|ALL|INTERSECT|EXCEPT|MINUS|EXISTS|CASE|WHEN|THEN|ELSE|END|WITH|RECURSIVE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|IF|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|CHECK|UNIQUE|DEFAULT|INDEX|BEGIN|COMMIT|FETCH|FIRST|NEXT|ROWS|ONLY|OFFSET|LIMIT|DESC|ASC|OVER|PARTITION|START|CONNECT|PRIOR|LEVEL|USING|EXCLUDE|GENERATED|ALWAYS|IDENTITY|RESTRICT|CASCADE|TRUE|FALSE";
const RE_SQL = new RegExp(
  `(--[^\\n]*)|('(?:[^']|'')*')|\\b(${PALABRAS})\\b|\\b(\\d+(?:\\.\\d+)?)\\b|\\b([A-Za-z_]+)(?=\\s*\\()`,
  "gi"
);
function escapar(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
function resaltarSQL(texto) {
  let salida = "", ultimo = 0;
  texto.replace(RE_SQL, (m, com, str, kw, num, fn, idx) => {
    salida += escapar(texto.slice(ultimo, idx));
    const clase = com ? "com" : str ? "str" : kw ? "kw" : num ? "num" : "fn";
    salida += `<span class="${clase}">${escapar(m)}</span>`;
    ultimo = idx + m.length;
    return m;
  });
  return salida + escapar(texto.slice(ultimo));
}
window.resaltarSQL = resaltarSQL;
window.escaparHTML = escapar;
