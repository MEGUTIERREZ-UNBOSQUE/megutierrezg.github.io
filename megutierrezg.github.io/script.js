// =========================================================
// script.js
// Lógica mínima del e-portafolio: año dinámico en el footer
// y manejo de la imagen de avatar por si no se ha subido aún.
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Año actual en el pie de página
  const anioSpan = document.getElementById("anio");
  if (anioSpan) {
    anioSpan.textContent = new Date().getFullYear();
  }

  // Si la foto/avatar todavía no existe en video/avatar.jpg,
  // se muestra un color de fondo en vez de un ícono de imagen rota.
  const avatarImg = document.getElementById("avatarImg");
  if (avatarImg) {
    avatarImg.addEventListener("error", () => {
      avatarImg.style.display = "none";
    });
  }
});