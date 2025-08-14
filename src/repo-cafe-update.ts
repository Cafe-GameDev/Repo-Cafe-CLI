#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HELP_TEXT = `
☕ Uso: repo-cafe-update

   Hora de passar um café fresquinho para a ferramenta! Este comando verifica
   se há uma nova versão do 'repo-cafe' no NPM e a instala.
   Se o seu "blend" já estiver atualizado, ele força a sincronização dos manuais
   do Repo Café, garantindo que sua base de conhecimento esteja sempre com o
   aroma das últimas novidades.
`;

async function checkForUpdates() {
    if (process.argv.includes('--help')) {
        console.log(HELP_TEXT);
        return;
    }

    try {
        // Encontra o caminho do próprio pacote para ler a versão atual
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const currentVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
        
        console.log('-> Verificando a versão mais recente no NPM...');
        const latestVersion = execSync('npm view repo-cafe version').toString().trim();

        if (currentVersion !== latestVersion) {
            console.log(`-> Atualizando Repo Cafe CLI: v${currentVersion} -> v${latestVersion}`);
            execSync('npm install -g @google/gemini-cli@latest', { stdio: 'inherit' });
            execSync('npm install -g repo-cafe@latest', { stdio: 'inherit' });
            console.log('\n✅ repo-cafe atualizado com sucesso!');
        } else {
            console.log('-> Você já está com a versão mais recente do Repo Cafe CLI.');
            // Força a reinstalação para garantir que o postinstall seja executado
            console.log('-> Sincronizando com Repo-Cafe');
            execSync('node dist/repo-update.js', { stdio: 'inherit' });
            console.log('\n✅ Repo-Cafe sincronizados com sucesso!');
        }
    } catch (error) {
        console.error('\nERRO: Falha ao verificar ou instalar atualizações. Tente executar o comando manualmente:');
        console.error('npm install -g repo-cafe@latest');
        process.exit(1);
    }
}

checkForUpdates();
