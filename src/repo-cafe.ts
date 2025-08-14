#!/usr/bin/env node
const { spawn } = require('child_process');

const HELP_TEXT = `
☕ Bem-vindo ao Repo Cafe CLI!

   Você está na cafeteria de código do Repo Café. Pegue uma xícara e vamos programar!

   Uso:
     repo-cafe [opções-do-gemini] [prompt]

   Nosso cardápio de comandos especiais:

   - cafe-new [blend] <nome-do-projeto>: Serve um "Café Quentinho" (cria um projeto Godot a partir dos templates Platformer, TopDown, ou headless).
   - cafe-rename: Dá uma "mexida" nos nomes de arquivos e pastas, deixando tudo padronizado e com aroma de código limpo.
   - repo-cafe-update: Passa um café fresquinho para a ferramenta, atualizando o 'repo-cafe' para a versão mais recente.
   - repo-update: Quer um "refil" de conhecimento? Atualiza a base de conhecimento (manuais do Repo Café) com as últimas novidades.

   Para um mergulho mais fundo em cada comando, use: <comando> --help
   Exemplo: cafe-new --help

   A seguir, a ajuda original do Gemini (o nosso fornecedor oficial de grãos):
   ----------------------------------------------------------------
`;

function main() {
    const args = process.argv.slice(2);

    // A única exceção: se for um pedido de ajuda, mostramos nosso texto primeiro.
    const isHelpCommand = args.some(arg => arg.startsWith('--help'));

    if (isHelpCommand) {
        console.log(HELP_TEXT);
    }

    // Se não houver argumentos, 'gemini' será chamado para iniciar o modo de chat.
    // Se houver argumentos, eles serão passados diretamente.
    const geminiProcess = spawn('gemini', args, {
        stdio: 'inherit',
        shell: true // No Windows, é necessário para encontrar executáveis .cmd globais
    });

    geminiProcess.on('error', (err) => {
        // Não mostramos o erro para comandos de ajuda, pois o Gemini CLI pode sair com código de erro
        // em alguns cenários de ajuda que não são erros reais para o usuário.
        if (!isHelpCommand) {
            console.error('Erro ao tentar executar o comando "gemini".');
            console.error('Por favor, verifique se o @google/gemini-cli está instalado e acessível no seu PATH.');
            console.error(err);
            process.exit(1);
        }
    });

    geminiProcess.on('exit', (code) => {
        // O Gemini CLI pode sair com código 1 em alguns casos de --help,
        // então só consideramos um erro real se não for um comando de ajuda.
        if (code !== 0 && !isHelpCommand) {
            process.exit(code);
        }
    });
}

main();
