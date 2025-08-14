#!/usr/bin/env node
import { execSync } from 'child_process';
import * as https from 'https';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import AdmZip from 'adm-zip';

const HELP_TEXT: string = `
☕ Uso: repo-update

   Quer um "refil" de conhecimento? Este comando força a atualização da base
   de conhecimento (os manuais do Repo Café). Ele baixa a versão mais recente
   diretamente do GitHub, garantindo que o assistente tenha sempre o contexto
   mais atualizado para trabalhar. É como reabastecer a máquina de café com
   os melhores grãos!
`;

// --- Configuração ---
const repoOwner: string = 'Cafe-GameDev';
const repoName: string = 'Repo-Cafe';
const repoUrl: string = `https://github.com/${repoOwner}/${repoName}/archive/refs/heads/main.zip`;
const contextDir: string = path.join(os.homedir(), '.gemini');
const zipPath: string = path.join(contextDir, 'context.zip');
const versionFilePath: string = path.join(contextDir, 'version.json');

interface VersionData {
    commit: string;
}

// Função para obter o último commit hash da API do GitHub
function getLatestCommitHash(): Promise<string> {
    return new Promise((resolve) => {
        const options: https.RequestOptions = {
            hostname: 'api.github.com',
            path: `/repos/${repoOwner}/${repoName}/commits/main`,
            method: 'GET',
            headers: { 'User-Agent': 'Cafe-Gemini-Updater' }
        };
        https.get(options, (res: https.IncomingMessage) => {
            let data: string = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json: { sha?: string } = JSON.parse(data);
                    if (json.sha) {
                        resolve(json.sha);
                    } else {
                        // Fallback em caso de resposta inesperada da API
                        resolve('N/A');
                    }
                } catch (e: any) {
                    resolve('N/A'); // Resolve para não quebrar a instalação
                }
            });
        }).on('error', (err: Error) => {
            console.error(`Erro ao obter o último commit hash: ${err.message}`);
            resolve('N/A'); // Resolve para não quebrar a instalação
        });
    });
}

// Função para baixar um arquivo, tratando redirecionamentos
function download(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response: https.IncomingMessage) => {
            if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Falha ao baixar o arquivo: Status Code ${response.statusCode}`));
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => file.close(() => resolve()));
        }).on('error', (err: Error) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function run(): Promise<void> {
    if (process.argv.includes('--help')) {
        console.log(HELP_TEXT);
        return;
    }

    console.log(`----------------------------------------------------------------`);
    console.log(`☕ Configurando o ambiente para o Repo Cafe CLI...`);
    console.log(`----------------------------------------------------------------`);

    // Obter versões antes de qualquer modificação
    const newCommitHash: string = await getLatestCommitHash();
    let oldCommitHash: string = 'N/A';
    if (fs.existsSync(versionFilePath)) {
        try {
            const versionData: VersionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
            oldCommitHash = versionData.commit || 'N/A';
        } catch (e: any) { /* Ignora erros de leitura/parse */ }
    }

    if (newCommitHash !== 'N/A' && oldCommitHash !== newCommitHash) {
        console.log(`-> Atualizando manuais (Repo-Cafe): ${oldCommitHash.substring(0, 7)} -> ${newCommitHash.substring(0, 7)}`);
    } else {
        console.log('-> Repo-Cafe Está Atualizado');
    }

    // 1. Limpar diretório antigo, se existir, e criar um novo
    if (fs.existsSync(contextDir)) {
        fs.rmSync(contextDir, { recursive: true, force: true });
    }
    fs.mkdirSync(contextDir);

    // 2. Baixar o repositório como .zip
    try {
        await download(repoUrl, zipPath);
    } catch (e: any) {
        console.error(`
ERRO: Falha ao baixar o conteúdo do repositório.`, e);
        process.exit(1);
    }

    // 3. Descompactar e organizar
    try {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(contextDir, true);
        const extractedFolderName: string | undefined = fs.readdirSync(contextDir).find(f => f.startsWith('Repo-Cafe-'));
        if (extractedFolderName) {
            const extractedPath: string = path.join(contextDir, extractedFolderName);
            fs.readdirSync(extractedPath).forEach((file: string) => {
                fs.renameSync(path.join(extractedPath, file), path.join(contextDir, file));
            });
            fs.rmdirSync(extractedPath, { recursive: true });
        }
    } catch (e: any) {
        console.error(`
ERRO: Falha ao descompactar o conteúdo.`, e);
        process.exit(1);
    } finally {
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
    }

    // 4. Salvar a nova versão do commit
    try {
        fs.writeFileSync(versionFilePath, JSON.stringify({ commit: newCommitHash }, null, 2));
    } catch (e: any) {
        console.error('\nAVISO: Não foi possível salvar o arquivo de versão do commit.');
    }

    console.log(`----------------------------------------------------------------`);
    console.log(`✅ Ambiente configurado! O comando 'repo-cafe' está pronto.`);
    console.log(`----------------------------------------------------------------`);
}

run();