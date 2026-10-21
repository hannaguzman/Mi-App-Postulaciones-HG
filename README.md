# Mi app de postulaciones

Esta es la primera versión de una app web para registrar y seguir tus postulaciones laborales.

## Tecnologías

- HTML
- CSS
- JavaScript
- LocalStorage (para guardar los datos en el navegador)

## Cómo abrir la app localmente

1. Descarga o clona este repositorio.
2. Abre la carpeta del proyecto.
3. Haz doble clic en `index.html` o ejecuta un servidor local desde la terminal:

```bash
python -m http.server 8000
```

Luego abrí esta URL en tu navegador:

```text
http://localhost:8000
```

## Cómo subirla a GitHub

Si ya tenés el repositorio creado, ejecutá estos comandos desde la terminal dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Primera versión de app de postulaciones"
git branch -M main
git remote add origin https://github.com/hannaguzman/Mi-App-Postulaciones-HG.git
git push -u origin main
```

Si el repositorio ya existe y tiene contenido, solo necesitás:

```bash
git add .
git commit -m "Primera versión de app de postulaciones"
git push origin main
```

## Funcionalidades incluidas

- Formulario para ingresar empresa, rol y fecha
- Selector de estado: Enviado, En proceso, Rechazado y Oferta
- Lista de postulaciones con estado visible
- Mensaje cuando no hay postulaciones
- Notas opcionales de seguimiento
- Persistencia en localStorage para no perder datos al recargar
- Diseño responsive mobile-first

## Sugerencia

Si querés, en una próxima versión puedo agregar:

- edición de postulaciones
- filtros por estado
- orden por fecha
- exportación a CSV
- contador de estadísticas por etapa

