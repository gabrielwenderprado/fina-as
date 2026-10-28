# Mês a Certo — pronto para GitHub Pages

Este pacote é um app web estático: não tem login, servidor nem banco de dados. O salário, as contas e os gastos ficam no `localStorage` do navegador ou da instalação neste aparelho. O app não envia os lançamentos ao GitHub.

## Abrir no computador

O Live Server, sozinho, não compila React/TypeScript (`.tsx`). Se abrir o `index.html` da pasta principal diretamente por ele, a página pode ficar em branco — isso não significa que os dados foram apagados nem que o app precise de uma base de dados.

Para testar localmente, instale Node.js 22 ou mais recente, extraia o ZIP e abra a pasta `github-pages-app` no VS Code. No terminal do VS Code, rode:

```bash
pnpm install
pnpm dev
```

Depois abra o endereço local que o Vite mostrar, normalmente `http://localhost:5173`. Se você não tiver pnpm, também pode usar `npm install` e depois `npm run dev`. O Live Server não é o comando para executar esta pasta-fonte.

## Publicar

1. Crie um repositório vazio no GitHub e envie **o conteúdo** da pasta `github-pages-app` para a branch `main`. Use o GitHub Desktop ou, se já usa o terminal, estes comandos depois de trocar os valores do repositório:

   ```bash
   cd github-pages-app
   git init
   git add .
   git commit -m "Publicar Mês a Certo"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

2. Confirme que o repositório contém `.github/workflows/deploy-pages.yml`. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
3. Abra **Actions** e aguarde o workflow terminar com sucesso. O GitHub mostrará o endereço do site. Cada atualização enviada à branch `main` será publicada automaticamente.
4. Abra esse endereço no celular e toque em **Instalar** dentro do app. Se a instalação direta não aparecer, o próprio app mostra as instruções para Android e iPhone.

O build usa caminhos relativos, então funciona em endereço de projeto como `usuario.github.io/nome-do-repositorio/`. A instalação exige HTTPS. A primeira abertura precisa de internet; depois, o service worker guarda os arquivos da interface para abrir o app offline.

## Saldo total da carteira

O valor no topo soma os rendimentos menos contas fixas e gastos variáveis de todos os meses registados até ao mês atual. Ele não muda quando se consulta outro mês no filtro. Registar uma conta ou gasto no mês atual diminui o saldo total; registar uma entrada aumenta-o. A previsão de sobra no painel principal continua a mostrar apenas o resultado do mês selecionado.

### Se o build falhar no Actions

Este pacote inclui `tw-animate-css` no `package.json` e no `pnpm-lock.yaml`, exigido pela folha de estilos. Se já enviou uma versão anterior que não listava essa dependência, substitua **ambos** os arquivos no repositório pelos desta versão e confirme que o workflow está em `.github/workflows/deploy-pages.yml`. O push inicia uma nova compilação.

## Seus dados e o backup

Os lançamentos ficam apenas no armazenamento local do navegador/instalação; não sincronizam entre outros aparelhos. Limpar os dados do navegador, trocar de aparelho ou mudar o domínio pode deixar os registros inacessíveis. Dentro do app, abra **Backup** e baixe um arquivo JSON. Para transferir ou recuperar os lançamentos, use **Restaurar de um arquivo**.

O backup contém informações financeiras: guarde-o em local privado e não o publique no GitHub. O repositório leva apenas o código e os ícones; ele não recebe os lançamentos financeiros.

Uma atualização normal do código não apaga o armazenamento local. Mesmo assim, `localStorage` não é serviço de backup e pode ser limpo pelo navegador ou pelo sistema operacional.

## Fontes oficiais

- [Vite: executar e publicar um site estático](https://vite.dev/guide/static-deploy)
- [GitHub Pages: workflows personalizados](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [MDN: tornar uma PWA instalável](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
