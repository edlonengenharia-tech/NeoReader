# 🧪 Como Testar o NekoReader

## ✅ Correções Aplicadas

1. **Erro de sintaxe corrigido** - Faltava `data:` nas funções `readCBZ` e `readCBR`
2. **Suporte a CBR** - Agora lê arquivos .cbr/.rar usando node-unrar-js
3. **Configuração electron-builder** - fileAssociations movido para posição correta

## 🚀 Passos para Testar

### 1. Instalar Dependências
```bash
cd neko-reader-electron
npm install
```

### 2. Rodar o App em Modo Desenvolvimento
```bash
npm start
```

Ou:
```bash
npx electron .
```

### 3. Testar os Formatos

- **PDF**: Arraste um arquivo .pdf para a janela
- **CBZ**: Arraste um arquivo .cbz ou .zip para a janela  
- **CBR**: Arraste um arquivo .cbr ou .rar para a janela

### 4. Gerar EXE Portátil (Windows)
```bash
npm run dist
```

O arquivo será gerado em: `dist/NekoReader-portable.exe`

## 📋 Estrutura de Arquivos Corrigida

```
neko-reader-electron/
├── src/
│   ├── main.js          ✅ Sintaxe corrigida (data: adicionado)
│   ├── preload.js       ✅ Bridge segura
│   ├── renderer.js      ✅ Renderiza PDF com canvas HTML5
│   ├── index.html       ✅ UI completa
│   └── style.css        ✅ Temas (dark/midnight/light)
├── package.json         ✅ Sem dependências nativas problemáticas
├── BUILD-PORTABLE.cmd   ✅ Script Windows para gerar EXE
├── TESTE-NPM.cmd        ✅ Script Windows para testar
└── README.md            ✅ Documentação
```

## 🎯 Formatos Suportados

- ✅ **PDF** - Via pdfjs-dist (renderizado no browser)
- ✅ **CBZ/ZIP** - Via adm-zip (JavaScript puro)
- ✅ **CBR/RAR** - Via node-unrar-js (JavaScript puro, WebAssembly)

## ⚠️ Se Ainda Der Erro

Se aparecer algum erro, me envie a mensagem completa e eu corrijo!

Erros comuns:
- "Cannot find module" → Execute `npm install`
- "SyntaxError" → Verifique se copiou todos os arquivos corretamente
- "electron not found" → Use `npx electron .` em vez de `electron .`
