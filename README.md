# E-portafolio · Bases de Datos 1

Elías Gutiérrez · Ingeniería de Sistemas · Universidad El Bosque · 2026-2

Sitio publicado: https://megutierrez-unbosque.github.io/megutierrezg.github.io/

Evidencias de la materia organizadas en cuatro partes:

| Página | Contenido |
|---|---|
| `index.html` | Presentación (video y foto), recorrido del semestre e índice de evidencias |
| `modelado.html` | Clases de modelado, las 11 reglas de transformación, Taller 1 (Bahía Verde) y Parcial 1 |
| `normalizacion.html` | Ejercicio interactivo de 1FN a 3FN y los talleres de normalización |
| `sql.html` | Laboratorio con PostgreSQL en el navegador, las 9 clases de SQL y los scripts de práctica |
| `proyecto.html` | Proyecto final: sistema contable en PostgreSQL desplegado en Azure |

## Cómo está hecho

HTML, CSS y JavaScript sin dependencias ni paso de compilación, para que GitHub Pages lo publique tal cual. El laboratorio SQL carga [PGlite](https://pglite.dev) 0.5.17 (PostgreSQL compilado a WebAssembly, licencia Apache-2.0) desde `assets/vendor/pglite/` solo cuando se usa, y ejecuta los scripts `assets/sql/01_ddl_tablas.sql` y `02_seed_datos_realistas.sql` del proyecto final.

Los diagramas de `assets/img/diagramas/` se exportaron como imagen desde los archivos de draw.io que están en `documentos/originales/`.

## Verlo en local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```
