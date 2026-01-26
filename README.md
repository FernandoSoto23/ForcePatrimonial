# Force Patrimonial V2

🌐 **URL de producción:** [https://force-patrimonialv2.vercel.app](https://force-patrimonialv2.vercel.app)

## 📌 Descripción general

**Force Patrimonial V2** es una aplicación web de **monitoreo de alertas y seguimiento de unidades en tiempo real**, desarrollada a la medida para operaciones de **seguridad patrimonial**.

La plataforma consume y procesa información directamente desde **Wialon**, utilizando su **API y documentación oficial**, para mostrar los datos de forma clara, centralizada y orientada a la operación.

Toda la lógica de visualización, control y experiencia de usuario ha sido diseñada específicamente para las necesidades del monitoreo operativo.

---

## 🚛 Funcionalidades principales

* 📍 **Monitoreo de unidades en tiempo real**
* 🚨 **Gestión y visualización de alertas**
* 🛰️ Consumo de datos GPS y telemetría desde **Wialon**
* 📊 Visualización de información operativa en dashboards
* 🔄 Actualización continua de datos
* 🧩 Software **100% a la medida**, basado en la operación real

---

## 🔗 Integración con Wialon

La aplicación se integra completamente con **Wialon**, utilizando:

* API oficial de Wialon
* Endpoints documentados para:

  * Unidades
  * Posiciones
  * Eventos y alertas
  * Estados y sensores

Toda la información disponible en Wialon es **consumida, procesada y presentada** dentro del sistema, respetando la estructura y capacidades definidas en su documentación oficial.

📘 Referencia:
[https://sdk.wialon.com/wiki/en/sidebar/remoteapi/apiref](https://sdk.wialon.com/wiki/en/sidebar/remoteapi/apiref)

---

## ⚙️ Tecnologías utilizadas

* ⚛️ **React** – Librería principal de UI
* ⚡ **Vite** – Herramienta de desarrollo y build
* 🔁 **Hot Module Replacement (HMR)**
* 🧹 **ESLint** – Estándares de código
* 🌐 **Vercel** – Hosting y despliegue

---

## 🔌 Plugins de React en Vite

El proyecto puede utilizar cualquiera de los siguientes plugins oficiales:

### `@vitejs/plugin-react`

* Basado en **Babel**
* Mayor compatibilidad con el ecosistema React
* Recomendado cuando se requiere flexibilidad

### `@vitejs/plugin-react-swc`

* Basado en **SWC** (alto rendimiento)
* Compilación más rápida

⚠️ Nota: El **React Compiler** no es compatible actualmente con SWC.

---

## 🧪 Estándares y buenas prácticas

* Código modular y reutilizable
* Separación clara entre lógica, servicios y UI
* Consumo de APIs centralizado
* Validaciones y control de estados para operación en tiempo real

---

## 🛠️ Requisitos del entorno

* Node.js 18 o superior
* Gestor de paquetes: npm, yarn o pnpm

---

## ▶️ Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Vista previa del build
```

---

## 📚 Recursos

* Documentación de React: [https://react.dev/](https://react.dev/)
* Documentación de Vite: [https://vite.dev/](https://vite.dev/)
* Documentación de Wialon: [https://sdk.wialon.com/](https://sdk.wialon.com/)

---

✍️ *Este README describe Force Patrimonial V2 como una plataforma de monitoreo operativo desarrollada a la medida y basada en la integración total con Wialon.*
