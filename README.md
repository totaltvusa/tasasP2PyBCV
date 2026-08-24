# 🇻🇪 Tasas Venezuela P2P & BCV (Standalone App)

Monitor en tiempo real de precios promedio del mercado **Binance P2P (USDT / Bolívares)** y tasas oficiales del **Banco Central de Venezuela (Dólar BCV y Euro BCV)** con calculadora de conversión instantánea.

---

## 🚀 Características Principales

- **💵 Dólar y Euro Oficial BCV:** Consulta en tiempo real de las tasas oficiales publicadas por el Banco Central de Venezuela.
- **🟡 Binance P2P en Vivo (USDT/VES):** Precios promedio de compra y venta, mejores ofertas de comerciantes verificados, métodos de pago (Pago Móvil, Banesco, etc.) y límites.
- **📈 Brecha Cambiaria (%):** Cálculo automático del spread / prima entre el mercado P2P y la tasa oficial BCV.
- **🧮 Calculadora & Conversor Interactivo:** Calcula montos exactos en Bolívares o USDT con comparativa paralela de ahorro/ganancia.
- **📲 Copiar Reporte Rápido:** Formato listo para compartir en WhatsApp o Telegram con un solo clic.
- **⚡ API JSON Pública:** Endpoint en `/api/v1/rates` para consumir las tasas desde cualquier backend o aplicación externa.
- **📱 Mobile-First:** Totalmente optimizado para teléfonos y escritorios con diseño Dark FinTech y Glassmorphism.

---

## 🛠️ Cómo Subir a GitHub y Desplegar en Vercel

### Paso 1: Crear el Repositorio en GitHub
1. Entra a [github.com/new](https://github.com/new).
2. Nombra el repositorio (ejemplo: `TasasP2P-Venezuela` o `tasas-bcv-p2p`).
3. Déjalo **Público** o **Privado** y **NO** marques "Add README" ni ".gitignore" (ya están creados localmente).
4. Haz clic en **Create repository**.

### Paso 2: Vincular y Subir desde la Terminal
Ejecuta los siguientes comandos dentro de esta carpeta (`/mnt/Data/Projects for Antigravity/TasaP2P-BCV`):

```bash
git init
git add .
git commit -m "feat: initial commit - standalone Venezuela P2P and BCV rates tracker"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 3: Conectar a Vercel con tu Dominio
1. Entra a [vercel.com/new](https://vercel.com/new).
2. Importa el repositorio que acabas de subir.
3. Haz clic en **Deploy** (no requiere variables de entorno obligatorias para funcionar de inmediato).
4. Una vez desplegado, ve a **Settings** -> **Domains**.
5. Agrega tu dominio o subdominio personalizado (por ejemplo: `tasas.ac4.club` o `dolar.tudominio.com`).
6. Configura el CNAME correspondiente en Cloudflare / tu proveedor DNS (apuntando a `cname.vercel-dns.com` en modo *DNS Only*).

---

## 🔌 API Endpoint

Puedes consumir las tasas en formato JSON haciendo una petición GET a:
`GET https://tu-dominio.com/api/v1/rates`
