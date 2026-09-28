# ZIP THREADS

Aplicación web construida con Expo + React Native para analizar archivos ZIP exportados desde Threads y mostrar de forma visual:

- seguidores
- cuentas que sigues
- cuentas que no te siguen de vuelta

La app procesa el archivo localmente en el navegador, sin enviarlo a ningún servidor.

## Características

- Carga de archivos `.zip` desde la versión web
- Lectura de ZIP y detección automática de archivos `followers` y `following`
- Soporte para JSON y HTML exportados por Threads
- Listado ordenado y paginado de cuentas
- Apertura directa del perfil en una nueva pestaña
- Validación y manejo de errores para ZIP inválidos o vacíos

## Tecnologías

- Expo
- React Native
- JavaScript / TypeScript
- JSZip
- Bootstrap (solo para estilos base en web)

## Requisitos

- Node.js 22.x
- npm o yarn

## Instalación

1. Clona este repositorio.
2. Entra a la carpeta del proyecto:

```bash
cd para_threads
```

3. Instala las dependencias:

```bash
npm install
```

## Ejecución

### Web

```bash
npm run web
```

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

## Uso

1. Ejecuta la aplicación en navegador.
2. Haz clic en `Seleccionar ZIP`.
3. Elige un archivo exportado de Threads con extensión `.zip`.
4. La aplicación analizará automáticamente los archivos `followers` y `following` dentro del ZIP.
5. Podrás revisar tus seguidores, las cuentas que sigues y las que no te siguen de vuelta.

## Nota importante

Esta aplicación está orientada a la versión web para la carga de archivos. La lógica de procesamiento de ZIP se ejecuta del lado del cliente y no requiere backend.

## Licencia

Este proyecto se distribuye bajo la licencia incluida en el archivo `LICENSE`.
