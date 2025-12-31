# iRamais Hub - Intranet Corporativa

Sistema moderno de gestão interna, ramais, notícias e termos de responsabilidade.

## 🚀 Como subir para o GitHub e Ativar o Deploy

1.  **Crie um repositório no GitHub** e suba todos os arquivos deste projeto.
2.  **Configure a API Key**:
    *   No seu repositório no GitHub, vá em **Settings** > **Secrets and variables** > **Actions**.
    *   Clique em **New repository secret**.
    *   Nome: `GEMINI_API_KEY`
    *   Valor: Cole sua chave da API do Google Gemini.
3.  **Ative o GitHub Pages**:
    *   Vá em **Settings** > **Pages**.
    *   Em **Build and deployment** > **Source**, altere para **GitHub Actions**.
4.  **Deploy**:
    *   Sempre que você fizer um `push` para a branch `main`, o GitHub Actions fará o build automático.
    *   O link do seu sistema estará disponível em: `https://seu-usuario.github.io/seu-repositorio/`

## 🛠️ Tecnologias
*   React 19 + Vite
*   Firebase (Auth, Firestore, Storage)
*   Tailwind CSS
*   Google Gemini AI
*   Lucide React (Ícones)
