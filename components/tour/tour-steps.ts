import { TourConfig } from "./tour-types";

export const TOUR_STEPS: TourConfig = {
  dashboard: [
    {
      title: "Bienvenido a Camella",
      content: "Tu centro de control para inteligencia comercial B2B. Aquí podrás ver un resumen de tu actividad y uso.",
      position: "center",
      image: "/onboarding/dashboard.mp4"
    },
    {
      targetId: "dashboard-tab-switcher",
      title: "Analíticas y Registros",
      content: "Alterna entre una vista gráfica de tu actividad y un registro detallado de todas las interacciones con el agente.",
      position: "bottom"
    },
    {
      targetId: "dashboard-quick-actions",
      title: "Accesos Rápidos",
      content: "Navega rápidamente a las herramientas principales: Agente, Base de Empresas y Gestión de Servicios.",
      position: "left"
    }
  ],
  chat: [
    {
      title: "Tu Agente Comercial",
      content: "Este no es un chat normal. Es un analista experto que puede investigar empresas, redactar correos y darte insights estratégicos.",
      position: "center",
      image: "/landingpagedemos/DemoAgente1.mp4"
    },
    {
      targetId: "chat-suggestions",
      title: "Ideas para empezar",
      content: "¿No sabes qué preguntar? Prueba con una de estas sugerencias para ver el poder del agente en acción.",
      position: "top"
    },
    {
      targetId: "chat-input-bar-wrapper",
      title: "Pide lo que necesites",
      content: "Escribe tu consulta en lenguaje natural. Ejemplo: 'Busca empresas de logística en Guayas con ingresos mayores a 1M'.",
      position: "top"
    }
  ],
  companies: [
    {
      title: "Base de Datos Empresarial",
      content: "Acceso directo a información financiera y legal de más de 300,000 empresas en Ecuador.",
      position: "center",
      image: "/landingpagedemos/companiesDbDemo.mp4"
    },
    {
      targetId: "companies-filters",
      title: "Filtros Avanzados",
      content: "Segmenta el mercado por ubicación, industria, tamaño de ingresos, número de empleados y más.",
      position: "right"
    },
    {
      targetId: "companies-table",
      title: "Resultados Detallados",
      content: "Visualiza métricas clave al instante. Haz clic en cualquier empresa para ver su perfil completo, contactos y evolución financiera.",
      position: "top"
    }
  ],
  offerings: [
    {
      title: "Gestión de Servicios",
      content: "Crea un catálogo digital de tus servicios para compartirlos fácilmente con prospectos.",
      position: "center",
      image: "/landingpagedemos/CatalogoServiciosDemo.mp4"
    }
  ],
  docs: [
    {
      title: "Centro de Documentación",
      content: "Aquí encontrarás todo lo necesario para dominar Camella.",
      position: "center"
    },
    {
      targetId: "docs-sidebar",
      title: "Navegación",
      content: "Explora las diferentes secciones, desde los primeros pasos hasta guías avanzadas.",
      position: "right"
    },
    {
      targetId: "docs-content",
      title: "Contenido",
      content: "Encuentra guías paso a paso, ejemplos de uso y explicaciones detalladas.",
      position: "left"
    }
  ]
};

