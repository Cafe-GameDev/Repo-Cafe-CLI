#!/usr/bin/env node

// src/cafe-rename.ts
import * as fs from "fs";
import * as path from "path";
var HELP_TEXT = `
☕ Uso: cafe-rename --source <caminho>

   Dê uma "mexida" nos nomes dos seus arquivos e pastas! Este comando normaliza
   recursivamente os nomes, deixando tudo padronizado e com aroma de código limpo.
   É como organizar sua prateleira de grãos: tudo no lugar certo para um café perfeito.

As seguintes transformações são aplicadas:
- Substitui espaços por underscores (_).
- Remove acentos (ex: 'caminhão' -> 'caminhao').
- Remove caracteres especiais, mantendo apenas letras, números, underscores (_), hífens (-) e pontos (.).

Opções:
  --source <caminho>  O "moedor" de onde os arquivos serão renomeados.
                      O padrão é o diretório de trabalho atual.
  --help              Mostra este "cardápio" de ajuda.
`;
function normalizeName(name) {
  const normalized = name.normalize("NFD").replace(/[\n\u0300-\u036f]/g, "").replace(/ /g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
  return normalized;
}
function collectPaths(directory, allFiles = [], allDirs = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name.toLowerCase() === "addons") {
      console.log(`Ignorando: ${fullPath}`);
      continue;
    }
    if (entry.isDirectory()) {
      allDirs.push(fullPath);
      collectPaths(fullPath, allFiles, allDirs);
    } else {
      allFiles.push(fullPath);
    }
  }
  return { allFiles, allDirs };
}
function renamePath(oldPath) {
  const directory = path.dirname(oldPath);
  const oldName = path.basename(oldPath);
  const newName = normalizeName(oldName);
  const newPath = path.join(directory, newName);
  if (oldPath !== newPath) {
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`Renomeado: ${oldName} -> ${newName}`);
      return newPath;
    } catch (err) {
      console.error(`Erro ao renomear ${oldPath}:`, err);
      return oldPath;
    }
  }
  return oldPath;
}
function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(HELP_TEXT);
    return;
  }
  let sourceDir = process.cwd();
  const sourceIndex = args.indexOf("--source");
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    sourceDir = path.resolve(args[sourceIndex + 1]);
  }
  if (!fs.existsSync(sourceDir)) {
    console.error(`Erro: O diretório de origem não existe: ${sourceDir}`);
    return;
  }
  console.log(`Iniciando normalização em: ${sourceDir}`);
  let { allFiles, allDirs } = collectPaths(sourceDir);
  console.log(`
--- Renomeando arquivos ---`);
  allFiles.forEach((filePath) => {
    renamePath(filePath);
  });
  console.log(`
--- Renomeando diretórios ---`);
  allDirs.sort((a, b) => b.length - a.length);
  allDirs.forEach((dirPath) => {
    renamePath(dirPath);
  });
  console.log(`
Normalização concluída.`);
}
main();
