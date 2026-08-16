import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// O jogo tem três páginas HTML. Sem declarar as três aqui, o build só levaria a
// `index.html` da raiz — o Vite não segue link de uma página para outra, e o
// site publicado ficaria sem o jogo e sem a área do usuário.
const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                index: page("./index.html"),
                game: page("./pages/game.html"),
                user: page("./pages/user.html")
            }
        },
        // O bundle do Phaser passa de 1 MB sozinho; o aviso padrão de 500 kB só
        // faria barulho em todo build.
        chunkSizeWarningLimit: 2000
    }
});
