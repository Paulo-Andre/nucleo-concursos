import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// Rastreio opcional: não requisita scripts nem envia dados quando não configurado.
const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
if (analyticsEndpoint && analyticsWebsiteId) {
  try {
    const analyticsUrl = new URL(analyticsEndpoint.replace(/\/$/, "") + "/umami", window.location.origin);
    if (analyticsUrl.protocol === "https:" || analyticsUrl.origin === window.location.origin) {
      const script = document.createElement("script");
      script.src = analyticsUrl.toString();
      script.defer = true;
      script.dataset.websiteId = analyticsWebsiteId;
      document.head.appendChild(script);
    }
  } catch {
    // Configuração inválida não afeta o acesso às aulas.
  }
}
