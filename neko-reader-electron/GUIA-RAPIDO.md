# 🚀 Guia Rápido - NekoReader Windows

## ✅ O que foi corrigido

1. **Suporte a CBR/RAR** - Agora lê arquivos .cbr usando node-unrar-js (pure JS)
2. **Erro do electron-builder** - fileAssociations movido para posição correta
3. **Zero dependências nativas** - Sem canvas, sem sevenzip, sem compilação C++

## 📋 Passo a passo para gerar o EXE

### 1. Copie a pasta
Copie a pasta `neko-reader-electron` para seu PC Windows (ex: `C:\Users\SeuNome\Downloads\neko-reader-electron`)

### 2. Abra o Prompt de Comando
- Pressione `Win + R`
- Digite `cmd` e pressione Enter
- Navegue até a pasta:
  ```cmd
  cd C:\Users\SeuNome\Downloads\neko-reader-electron
  ```

### 3. Instale as dependências
```cmd
npm install
```

Aguarde terminar (pode levar 1-2 minutos na primeira vez).

**Se der erro:**
- Verifique se o Node.js está instalado: `node --version` (deve ser 18+)
- Se não estiver, baixe em https://nodejs.org (versão LTS recomendada)
- Delete `node_modules` e `package-lock.json` e tente novamente

### 4. Teste o app (opcional)
```cmd
npx electron .
```

O app deve abrir. Teste abrir um arquivo .cbz, .cbr ou .pdf.

### 5. Gere o EXE portátil
```cmd
npx electron-builder --win portable
```

Ou use o script:
```cmd
BUILD-PORTABLE.cmd
```

Aguarde (pode levar 3-5 minutos).

### 6. Pegue o EXE
O arquivo será gerado em:
```
dist\NekoReader-portable.exe
```

Copie esse arquivo para qualquer lugar e execute! Não precisa de instalação.

## 🎯 Formatos suportados

- ✅ **.cbz** / **.zip** - Quadrinhos/mangás compactados
- ✅ **.cbr** / **.rar** - Quadrinhos/mangás em RAR
- ✅ **.pdf** - Livros e documentos PDF

## ⌨ Atalhos úteis

- `←` `→` - Navegar páginas
- `F` - Tela cheia
- `M` - Modo mangá (direita para esquerda)
- `D` - Página dupla
- `Tab` - Mostrar/ocultar biblioteca
- `Ctrl + Scroll` - Zoom

## ❓ Problemas comuns

### "npm install" dá erro
```cmd
npm cache clean --force
rmdir /s /q node_modules
del package-lock.json
npm install
```

### "'npx' não é reconhecido"
Reinstale o Node.js de https://nodejs.org

### "electron-builder" dá erro de configuração
Certifique-se de usar a versão atualizada do `package.json` (com `fileAssociations` em `win`, não em `nsis`).

### App não abre arquivo .cbr
Verifique se o arquivo não está corrompido. Se for RAR5, converta para CBZ usando 7-Zip.

### EXE muito grande (~150MB)
É normal. O portable inclui o runtime Electron completo para ser 100% portátil.

## 📞 Precisa de ajuda?

Se tiver problemas:
1. Verifique se o Node.js está na versão 18+ (`node --version`)
2. Delete `node_modules` e `package-lock.json` e rode `npm install` novamente
3. Verifique se tem internet conexão (precisa baixar dependências)

## 🎉 Pronto!

Agora você tem um leitor de mangás/HQ/PDF portátil para Windows, sem dependências nativas problemáticas!
