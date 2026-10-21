# 🔍 DEBUG - Detecção de Formato

## ✅ Correção Aplicada

Adicionei **detecção automática do formato real** do arquivo pelos bytes iniciais (magic number), não apenas pela extensão. Isso resolve o problema quando:
- Um arquivo CBR tem extensão .cbz
- Um arquivo CBZ tem extensão .cbr
- A extensão está errada ou corrompida

## 🧪 Como Testar com Debug

### 1. Iniciar o app com console visível
```cmd
cd neko-reader-electron
npx electron .
```

### 2. Abrir o DevTools
Pressione `Ctrl + Shift + I` para abrir o DevTools e ver os logs.

### 3. Tentar abrir um arquivo
Arraste um arquivo para a janela. Você verá logs como:
```
[book:open] Tentando abrir: C:\...\arquivo.cbr
[book:open] Extensão: .cbr | Formato real: rar
[book:open] Usando readCBR
```

## 📋 O que os logs mostram

### Formato detectado corretamente:
```
[book:open] Extensão: .cbr | Formato real: rar
[book:open] Usando readCBR
```
✅ Funciona!

### Formato diferente da extensão:
```
[book:open] Extensão: .cbz | Formato real: rar
[book:open] Usando readCBR
```
✅ Funciona! (usa o formato real, não a extensão)

### Formato desconhecido:
```
[book:open] Extensão: .xyz | Formato real: unknown
```
❌ Erro: "Formato não suportado"

## 🔧 Formatos Suportados

| Formato | Magic Number | Extensões |
|---------|--------------|-----------|
| PDF | `%PDF` (0x25 0x50 0x44 0x46) | .pdf |
| ZIP/CBZ | `PK` (0x50 0x4B) | .cbz, .zip |
| RAR/CBR | `Rar!` (0x52 0x61 0x72 0x21) | .cbr, .rar |
| 7Z | `7z` (0x37 0x7A 0xBC 0xAF) | .7z (não suportado ainda) |

## 🚀 Teste Agora

### Teste 1: Abrir um PDF
```
[book:open] Extensão: .pdf | Formato real: pdf
[book:open] Usando readPDF
```

### Teste 2: Abrir um CBZ
```
[book:open] Extensão: .cbz | Formato real: zip
[book:open] Usando readCBZ
```

### Teste 3: Abrir um CBR
```
[book:open] Extensão: .cbr | Formato real: rar
[book:open] Usando readCBR
```

## ⚠️ Se Ainda Der Erro

### Erro: "ADM-ZIP: Invalid or unsupported zip format"
**Causa:** Tentando abrir um arquivo RAR como ZIP
**Solução:** O arquivo é RAR mas tem extensão .cbz. Agora o app detecta automaticamente!

### Erro: "Cannot create symbolic link"
**Causa:** Problema ao gerar EXE (não relacionado à leitura)
**Solução:** Use `BUILD-PORTABLE.bat` ou execute como Administrador

### Erro: "Formato não suportado"
**Causa:** Arquivo corrompido ou formato desconhecido
**Solução:** Verifique se o arquivo abre em outro programa

## 📊 Logs Completos

Se precisar de ajuda, copie os logs do console:
1. Abra o DevTools: `Ctrl + Shift + I`
2. Vá na aba "Console"
3. Tente abrir o arquivo
4. Copie todas as linhas que começam com `[book:open]`

---

**Status:** ✅ Detecção automática de formato implementada
**Próximo passo:** Testar com arquivos reais e verificar os logs
