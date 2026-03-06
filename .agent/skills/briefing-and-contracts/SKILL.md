---
name: Briefing e Contratos
description: Lógica para fluxos de gestão de projetos, incluindo formulários de briefing dinâmicos e geração de modelos de contrato.
---

# Briefing e Contratos
Esta habilidade gerencia a lógica de negócio específica do domínio do ArqPonto, focando em formulários de briefing e geração de contratos legais.

## Sistema de Briefing
### Lógica do Formulário
- **Perguntas Condicionais**: Use o `tipo_projeto_id` para filtrar quais `briefing_questoes` são exibidas.
- **Ordenação de Perguntas**: Novas perguntas devem ser adicionadas ao final da lista automaticamente.
- **Conteúdo Dinâmico**: As respostas do briefing são armazenadas por projeto e devem estar acessíveis para a geração de contratos.

### Estrutura do Formulário (BriefingPage)
- Use um layout passo-a-passo ou categorizado para lidar com um grande número de perguntas.
- Esconda as perguntas até que um tipo de projeto seja selecionado.

## Geração de Contratos
### Variáveis de Modelo
Use chaves duplas para as tags.
- **Tags da Empresa**: `{{empresa_nome}}`, `{{empresa_cnpj}}`, `{{empresa_endereco}}`.
- **Tags do Cliente**: `{{cliente_nome}}`, `{{cliente_cpf_cnpj}}`.
- **Tags do Projeto**: `{{projeto_nome}}`, `{{projeto_descricao}}`, `{{valor_total}}`.

### Mapeamento de Dados
A lógica de mapeamento do serviço de contrato deve extrair dados de:
1. Tabela `empresas` (dependente do contexto).
2. Tabela `clientes` (vinculada ao projeto).
3. Tabelas `projetos` e `projeto_etapas`.

## Padrão de Implementação
Ao adicionar uma nova tag:
1. Atulize o `contratoService.ts`.
2. Adicione a tag à documentação disponível para os usuários na criação de modelos.
3. Garanta que nenhum valor vazio seja passado (use valores padrão quando apropriado).

### Fluxo de Dados
`Projeto` -> `Briefing` -> `Modelo de Contrato` -> `Documento Gerado`.
Garanta que este pipeline seja consistente em todos os tipos de projeto.
