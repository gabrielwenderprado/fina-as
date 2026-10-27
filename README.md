# Mês a Certo — pronto para GitHub Pages

Este pacote é um app web estático: não tem login, servidor nem banco de dados. O salário, as contas e os gastos ficam no `localStorage` do navegador ou da instalação neste aparelho. O app não envia os lançamentos ao GitHub.

## Publicar

1. Baixe e extraia o ZIP no computador. Crie um repositório vazio no GitHub.
2. Envie **o conteúdo** da pasta `github-pages-app` para a branch `main`. Pode usar o GitHub Desktop ou, se já usa o terminal, estes comandos depois de trocar os valores do repositório:

   ```bash
   cd github-pages-app
   git init
   git add .
   git commit -m "Publicar Mês a Certo"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

3. No repositório, abra **Settings → Pages** e, em **Build and deployment → Source**, escolha **GitHub Actions**.
4. Abra **Actions** e aguarde o workflow terminar com sucesso. O GitHub mostrará o endereço do site. Cada atualização enviada à branch `main` será publicada automaticamente.
5. Abra o endereço no celular e toque em **Instalar** dentro do app. Se a instalação direta não aparecer, o próprio app mostra as instruções para Android e iPhone.

O build usa caminhos relativos, então funciona em endereço de projeto como `usuario.github.io/nome-do-repositorio/`. A instalação exige HTTPS. A primeira abertura precisa de internet; depois, o service worker guarda os arquivos da interface para abrir o app offline.

## Seus dados e o backup

Os lançamentos ficam apenas no armazenamento local do navegador/instalação; não sincronizam com outros aparelhos. Limpar os dados do navegador, trocar de aparelho ou mudar o domínio pode deixar os registros inacessíveis. Dentro do app, abra **Backup** e baixe um arquivo JSON. Para transferir ou recuperar os lançamentos, use **Restaurar de um arquivo**.

O backup contém informações financeiras: guarde-o em local privado e não o publique no GitHub. O repositório leva apenas o código e os ícones; ele não recebe os lançamentos financeiros.

Uma atualização normal do código não apaga o armazenamento local. Mesmo assim, `localStorage` não é serviço de backup e pode ser limpo pelo navegador ou pelo sistema operacional.

## Fontes oficiais

- [Publicar com workflows do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Guia do Vite para GitHub Pages](https://vite.dev/guide/static-deploy)
- [MDN: tornar uma PWA instalável](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
