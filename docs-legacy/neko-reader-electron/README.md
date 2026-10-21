# NekoReader v2 - Leitor de Mangá/HQ/Livros (Windows)

Leitor de quadrinhos e mangás para Windows, **sem dependências nativas problemáticas**.

## ✅ Correções aplicadas

### 1. Suporte a CBR/RAR adicionado
Agora lê arquivos `.cbr` e `.rar` usando `node-unrar-js` (pure JavaScript, sem compilação nativa).

### 2. Erro do electron-builder corrigido
`fileAssociations` movido de `nsis` para `win` (posição correta).

### 3. Zero dependências nativas
- ❌ `canvas` (node-canvas) - **removido**
- ❌ `@napi-rs/canvas` - **removido**  
- ❌ `sevenzip` - **removido**
- ✅ `node-unrar-js` - pure JS para CBR
- ✅ `adm-zip` - pure JS para CBZ/ZIP
- ✅ `pdfjs-dist` - renderiza PDF no browser

## 🎯 Formatos suportados

| Formato | Como lê |
|---|---|
| `.cbz` / `.zip` | `adm-zip` (JavaScript puro) |
| `.cbr` / `.rar` | `node-unrar-js` (JavaScript puro) |
| `.pdf` | `pdfjs-dist` renderizado no renderer via canvas HTML5 |

## 🚀 Como usar

### Passo 1: Copiar a pasta
Copie a pasta `neko-reader-electron/` para o seu PC Windows.

### Passo 2: Instalar dependências
Abra o Prompt de Comando na pasta e execute:
```cmd
npm install
```

### Passo 3: Testar (opcional)
```cmd
npx electron .
```

### Passo 4: Gerar EXE portátil
```cmd
npx electron-builder --win portable
```

Ou use o script:
```cmd
BUILD-PORTABLE.cmd
```

O EXE será gerado em `dist\NekoReader-portable.exe`.

## ⚠️ Se der erro no npm install

Se aparecer erro de `node-unrar-js`, tente:
```cmd
npm install node-unrar-js --save
```

Se o erro persistir, verifique se o Node.js está na versão 18+:
```cmd
node --version
```

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

## 🤖 Integração com IA

Configure em ⚙ Opções → IA:
- **Qwen** (Alibaba) - chave grátis em dashscope.console.aliyun.com
- **Ollama** (local) - `http://localhost:11434/v1/chat/completions`

## 📁 Estrutura

```
neko-reader-electron/
├── src/
│   ├── main.js         # Suporta CBZ, CBR, PDF
│   ├── preload.js      # Bridge segura
│   ├── index.html      # UI
│   ├── style.css       # Temas
│   └── renderer.js     # Renderiza PDF com canvas HTML5
├── package.json        # SEM dependências nativas
├── BUILD-PORTABLE.cmd  # Gera o EXE
└── README.md           # Este arquivo
```

## 🔧 Requisitos

- **Node.js** 18+ (recomendado 20+)
- **Windows** 10/11 x64
- **Internet** na primeira compilação

## ❓ Problemas comuns

### "Formato não suportado: .cbr"
**Corrigido!** Agora suporta CBR. Certifique-se de usar a versão atualizada.

### "Invalid configuration object" no electron-builder
**Corrigido!** `fileAssociations` agora está na posição correta (`win`).

### "'electron' não é reconhecido"
Use `npx electron .` em vez de `electron .`

### EXE não gera
Verifique se `npm install` completou sem erros. Se necessário, delete `node_modules` e `package-lock.json` e rode `npm install` novamente.

## 📝 Licença

MIT
