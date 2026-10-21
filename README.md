# NekkoReader

Leitor de mangá, HQ, livros e PDFs — web + desktop (Electron). v3.0

## O que mudou (aprendizado aplicado do ACBR Comics Reader)

| Problema antigo | Solução inspirada no ACBR |
|---|---|
| Todas as páginas pré-renderizadas como dataURL (estouro de memória em livros grandes) | **Renderização lazy por página** (`utils/pageProvider.ts`) — só a página visível é extraída |
| Extração/trabalho pesado na thread principal | **Web Worker dedicado** (`workers/archive.worker.ts`), como o `worker-page.js` do ACBR |
| Sem controle de memória | **Cache LRU limitado por bytes** (`utils/blobCache.ts`, 300 MB) com invalidação por "jobId" ao trocar de livro (padrão `cacheJobId`/`setCacheSize` do ACBR) |
| Object URLs vazando | URLs com **contagem de referências** (`RefCountedUrl`) — liberadas ao desmontar/dar scroll |
| Biblioteca "fantasma" (`saveLibrary` nunca era lido) | Biblioteca persistida de verdade + **hidratação antes do primeiro render** |
| Estado salvo só em localStorage | No desktop: **JSON em arquivo no userData** via ponte `nekkoStore` (padrão favorites/history/settings do ACBR), escrita atômica |
| PDF.js carregado de CDN (quebra offline) | Worker do pdfjs **empacotado localmente** pelo Vite — funciona offline no .exe |
| Electron sem hardening | **Single instance, sandbox, permissões negadas, bloqueio de navegação/novas janelas** (safe environment do ACBR) |
| Toggle mangá pulava páginas / efeitos em updater | Corrigido: mantém a mesma página física; posições restauradas corretamente no modo RTL |
| Atalhos disparavam com modal aberto | Desativados enquanto um `[role=dialog]` está aberto |
| Busca da biblioteca decorativa | Busca **funcional** + remoção de itens |
| Cores hardcoded em JSX | Tokens CSS (`var(--accent)` etc.) em componentes reutilizáveis |

## Rodar

```bash
npm install
npm run dev        # web (vite)
npm run build      # bundle em dist/
npm start          # desktop (Electron)
npm run dist       # executável portátil Windows (release/)
# ou, no Windows: criar-exe.bat
```

## Formatos

- `.cbz` / `.zip` — JSZip no worker, páginas sob demanda
- `.cbr` / `.rar` — app desktop (node-unrar-js no main process)
- `.pdf` — PDF.js com worker local, render por página

## Estrutura

```
src/
  App.tsx                    # UI principal
  components/                # PageImage, LibrarySidebar, OptionsDialog, HelpDialog
  hooks/useReader.ts         # estado do leitor (sessão lazy, posição, atalhos)
  utils/pageProvider.ts      # BookSession + fontes (arquivo/PDF) + prefetch
  utils/blobCache.ts         # cache LRU por bytes + RefCountedUrl
  utils/pdf.ts               # pdfjs-dist (worker local) + pool de documento
  utils/archive.ts           # detecção de formatos + ponte desktop
  utils/storage.ts           # persistência (arquivo no desktop / localStorage web)
  workers/archive.worker.ts  # extração CBZ/CBR fora da thread principal
electron/
  main.cjs                   # janela + hardening + store JSON + unrar
  preload.cjs                # nekkoDesktop / nekkoStore (validados)
docs-legacy/neko-reader-electron/  # documentação antiga (legada)
```

> A chave `aiKey` fica no armazenamento local do dispositivo (arquivo userData no desktop). Não sincronize esse arquivo pela nuvem.
