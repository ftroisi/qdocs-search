import { runtimeENVs } from "./next.config.js/index.js";
import { z } from "zod";

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof runtimeENVs> {}
  }
}
