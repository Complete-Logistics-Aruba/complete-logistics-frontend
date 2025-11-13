import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

// Setup mock service worker
export const worker = setupWorker(...handlers);
