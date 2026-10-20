# NekoReader v2 - Leitor de Mangá/HQ/Livros (Windows)

Leitor de quadrinhos e mangás para Windows, **sem dependências nativas problemáticas**.

## ✅ O que mudou (vs v1)

| Problema na v1 | Solução na v2 |
|---|---|
| `canvas` (node-canvas) falha ao compilar no Windows | **Removido!** PDF é renderizado no renderer usando canvas HTML5 nativo do Chromium |
| `@napi-rs/canvas` como dependência opcional | **Removido!** Não é mais necessário |
| `sevenzip` com bindings nativos | **Removido!** Apenas formatos sem dependências nativas |
| Erro `cairo.h: No such file or directory` | **Eliminado!** Zero compilação C++ |
| Erro `404 Not Found` nos prebuilds do canvas | **Eliminado!** Não usa mais canvas nativo |

## 🎯 Formatos suportados

| Formato | Como lê |
|---|---|
| `.cbz` / `.zip` | `adm-zip` (JavaScript puro) |
| `.pdf` | `pdfjs-dist` renderizado no **renderer** via canvas HTML5 do Chromium |

> **Nota:** CBR/RAR, CBT/TAR e CB7/7Z foram temporariamente removidos para eliminar todas as dependências nativas. Converta para CBZ (é só renomear .rar → .cbz usando 7-Zip).

## 🚀 Como usar

### Testar (rodar sem compilar)

```
cd neko-reader-electron
TESTE-NPM.cmd
```

Ou manualmente:
```
npm install
npx electron .
```

### Gerar EXE portátil

```
BUILD-PORTABLE.cmd
```

Ou manualmente:
```
npm install
npx electron-builder --win portable
```

O EXE será gerado em `dist\NekoReader-portable.exe` — um único arquivo que você pode levar no pendrive!

## ⌨ Atalhos

| Tecla | Ação |
|---|---|
| `←` `→` | Página anterior / próxima |
| `Home` / `End` | Primeira / última página |
| `F` | Tela cheia |
| `M` | Modo mangá (RTL) |
| `D` | Página dupla |
| `W` | Ciclo ajuste (Largura/Altura/Página) |
| `+` / `-` | Zoom |
| `Ctrl` + Scroll | Zoom com roda do mouse |
| `Tab` | Mostrar/ocultar biblioteca |
| `Esc` | Sair da tela cheia |
| `Ctrl` + `,` | Abrir opções |
| `Ctrl` + `I` | Painel de IA |

## 🤖 Integração com IA

Configure em ⚙ Opções → IA:

- **Qwen** (Alibaba DashScope) - chave grátis em dashscope.console.aliyun.com
- **Ollama** (local, sem chave) - `http://localhost:11434/v1/chat/completions`
- **LM Studio** (local)
- Qualquer API compatível com OpenAI

## 📁 Estrutura

```
neko-reader-electron/
├── src/
│   ├── main.js         # Processo principal (janela, IPC, arquivos)
│   ├── preload.js      # Bridge segura contextBridge
│   ├── index.html      # UI + carrega pdf.js via CDN
│   ├── style.css       # Temas (escuro/meia-noite/claro)
│   └── renderer.js     # Lógica do leitor + renderização PDF
├── package.json        # SEM canvas, SEM sevenzip, SEM @napi-rs/canvas
├── BUILD-PORTABLE.cmd  # Gera o EXE
└── TESTE-NPM.cmd       # Testa rapidamente
```

## 🔧 Requisitos

- **Node.js** 18+ (o v24 funciona)
- **Windows** 10/11 x64
- **Internet** na primeira compilação (para baixar dependências npm)

## ❓ Problemas comuns

### "'electron' não é reconhecido"
Rode `npm install` primeiro, ou use `npx electron .` em vez de `electron .`

### "canvas.h not found" / "cairo.h not found"
**Não acontece mais na v2!** Se ainda aparecer, você está usando a v1. Use esta versão.

### EXE muito grande
O portable inclui o runtime Electron (~150MB). É o custo de ser 100% portátil sem instalação.

### PDF demora para abrir
PDFs grandes são renderizados página por página. O progresso é mostrado na tela.
Para PDFs muito grandes (500+ páginas), considere converter para CBZ com imagens já renderizadas.

## 📝 Licença

MIT
