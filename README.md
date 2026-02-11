# Sistema de Controle de Ponto

Sistema de controle de ponto desenvolvido para escritórios de arquitetura, com integração ao Supabase.

## Funcionalidades

- 👤 Autenticação de usuários (Admin e Colaboradores)
- ⏰ Registro de horas trabalhadas (normais e extras)
- 📊 Relatórios de pagamento
- 👥 Gestão de colaboradores
- 💾 Persistência de dados no Supabase

## Tecnologias

- React 19
- TypeScript
- Vite
- React Router DOM
- Supabase
- Tailwind CSS

## Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente no arquivo `.env.local`:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```
4. Execute o projeto:
   ```bash
   npm run dev
   ```

## Credenciais Padrão

- **Admin**: login: `admin` / senha: `admin`

## Estrutura do Projeto

- `/components` - Componentes React reutilizáveis
- `/pages` - Páginas da aplicação
- `/services` - Serviços de integração com o Supabase
- `/utils` - Funções utilitárias

## Licença

MIT