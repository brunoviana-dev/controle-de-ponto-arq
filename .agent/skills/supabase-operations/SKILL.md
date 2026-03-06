---
name: Operações Supabase
description: Diretrizes para gerenciar o banco de dados Supabase, autenticação e Edge Functions.
---

# Operações Supabase
Esta habilidade gerencia a interação entre o aplicativo React e o backend Supabase para o ArqPonto.

## Gestão de Repositório e Fluxo
1. **Controle de Versão (Git)**: Nenhuma alteração de código ou arquivos deve ser enviada (pushed) automaticamente para o repositório no GitHub. 
2. **Aprovação Explícita**: O envio das alterações para o GitHub só deve ocorrer mediante solicitação explícita por parte do usuário.

## Estratégia de Autenticação
1. **Papéis de Usuário**: O sistema diferencia entre `ADMIN`, `COLABORADOR` e `CLIENTE`.
2. **Mapeamento de Perfis**: Use uma tabela personalizada `perfis` que se mapeia ao sistema `auth.users` do Supabase para armazenar papéis e metadados como `empresa_id`.

## Gestão do Esquema do Banco de Dados
### Migrações
Todas as alterações de esquema devem ser documentadas nos arquivos `.sql` na raiz para rastreamento.

```sql
-- Padrão para adicionar colunas
ALTER TABLE nome_da_tabela ADD COLUMN nome_da_coluna TYPE DEFAULT valor_padrao;
```

### Estrutura de Tabelas
- **empresa_id**: Toda tabela relacionada a um inquilino DEVE ter uma coluna `empresa_id` do tipo `uuid` e uma chave estrangeira para a tabela `empresas`.
- **timestamps**: Use os campos `created_at` e `updated_at` em todas as tabelas.

## Edge Functions
- Use Edge Functions para operações que exigem privilégios mais altos ou lógica complexa (ex: geração de PDFs, operações em lote em múltiplas tabelas).
- **Verificação de Segurança**: Sempre verifique o JWT do usuário na Edge Function.

## Melhores Práticas de Consulta
- **Paginação**: Use `range(from, to)` para tabelas grandes como `folha_ponto`.
- **Seleções**: Evite `select('*')` em produção se a tabela for grande. Escolha apenas as colunas necessárias para minimizar a carga de dados.

```typescript
// Seleção Otimizada
const { data } = await supabase
  .from('projetos')
  .select('id, nome, status, data_entrega')
  .eq('empresa_id', empresaId);
```

## Tratamento de Erros
- Sempre verifique o objeto `error` retornado pelas consultas do Supabase.
- Lance mensagens de erro amigáveis ao usuário baseadas no código de erro do Supabase.
