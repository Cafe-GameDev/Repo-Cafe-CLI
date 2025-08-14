#!/usr/bin/env node
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_URL: string = 'https://github.com/Cafe-GameDev/Cafe-Quentinho.git';
const DEFAULT_BRANCH: string = 'master';

function printUsage(): void {
    console.log(`
☕ Uso: cafe-new [blend] <nome-do-projeto>

   Que tal um "Café Quentinho"? Este comando prepara um novo projeto Godot para você.
   É o seu espresso para o sucesso no desenvolvimento de jogos!

Argumentos:
  blend (opcional): O tipo de "grão" para o seu projeto.
    - 'headless' (Padrão): A base perfeita para qualquer projeto. Inclui todos os sistemas essenciais (menus, save, áudio, etc.) sem mecânicas de jogo.
    - 'platformer':      Um blend robusto, ideal para jogos de plataforma 2D (inclui a base headless).
    - 'topdown':         Um blend suave, perfeito para aventuras com visão de cima (inclui a base headless).

  nome-do-projeto: O nome para a sua "xícara" (o novo diretório do projeto).

Cardápio de Exemplos:
  cafe-new meu-novo-jogo                 (cria um projeto a partir do 'headless')
  cafe-new platformer meu-jogo-plataforma
  cafe-new topdown meu-rpg-descafeinado
    `);
    process.exit(0);
}

function runCommand(command: string, cwd?: string): void {
    try {
        execSync(command, { stdio: 'inherit', cwd });
    } catch (error) {
        console.error(`
Falha ao executar o comando: ${command}`);
        throw error;
    }
}

function renameProject(projectPath: string, newName: string): void {
    const godotFilePath = path.join(projectPath, 'project.godot');
    if (!fs.existsSync(godotFilePath)) {
        console.warn(`Aviso: Não foi possível encontrar ${godotFilePath} para renomear.`);
        return;
    }
    let content: string = fs.readFileSync(godotFilePath, 'utf8');
    content = content.replace(/config\/name=".*"/, `config/name="${newName}"`);
    fs.writeFileSync(godotFilePath, content, 'utf8');
}

async function setupProject(projectPath: string, sparsePaths: string[]): Promise<void> {
    console.log(`Inicializando o repositório e configurando o sparse checkout para: ${sparsePaths.join(', ')}`);
    runCommand('git init', projectPath);
    runCommand(`git remote add origin ${REPO_URL}`, projectPath);
    runCommand('git config core.sparseCheckout true', projectPath);

    fs.writeFileSync(path.join(projectPath, '.git', 'info', 'sparse-checkout'), sparsePaths.join('\n'));

    console.log(`
Baixando os arquivos do template (branch: ${DEFAULT_BRANCH})...
`);
    runCommand(`git pull origin ${DEFAULT_BRANCH}`, projectPath);
}

async function main(): Promise<void> {
    const args: string[] = process.argv.slice(2);
    let template: string;
    let projectName: string;

    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
    }

    const templateMap: { [key: string]: string } = {
        headless: 'HeadLess',
        platformer: 'Platformer',
        topdown: 'TopDown'
    };

    if (args.length === 0) {
        printUsage();
    } else if (args.length === 1) {
        if (Object.keys(templateMap).includes(args[0])) {
             printUsage();
        }
        template = 'headless';
        projectName = args[0];
    } else {
        template = args[0];
        projectName = args[1];
    }

    if (!Object.keys(templateMap).includes(template)) {
        console.error(`Erro: Template "${template}" inválido.`);
        printUsage();
    }

    const projectPath: string = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectPath)) {
        console.error(`Erro: O diretório "${projectName}" já existe.`);
        process.exit(1);
    }

    console.log(`Criando o projeto "${projectName}" a partir do template "${template}"...`);
    fs.mkdirSync(projectPath, { recursive: true });

    try {
        const templateFolder = templateMap[template];
        await setupProject(projectPath, [templateFolder + '/']);
        
        const sourceDir = path.join(projectPath, templateFolder);
        
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (fs.existsSync(sourceDir)) {
            const files = fs.readdirSync(sourceDir);
            for (const file of files) {
                fs.renameSync(path.join(sourceDir, file), path.join(projectPath, file));
            }
            fs.rmdirSync(sourceDir);
        } else {
            throw new Error(`A pasta do template '${templateFolder}' não foi encontrada após o download.`);
        }

        renameProject(projectPath, projectName);
        console.log(`
Template ${templateFolder} movido para a raiz do projeto.`);

        console.log(`
Projeto "${projectName}" criado com sucesso!`);
        console.log(`
Para começar, acesse a pasta do projeto:
  cd ${projectName}`);

    } catch (error: any) {
        console.error(`
Ocorreu um erro durante a criação do projeto: ${error.message}`);
        if (fs.existsSync(projectPath)) {
            console.log('Removendo diretório do projeto criado parcialmente...');
            fs.rmSync(projectPath, { recursive: true, force: true });
        }
        process.exit(1);
    }
}

main();
