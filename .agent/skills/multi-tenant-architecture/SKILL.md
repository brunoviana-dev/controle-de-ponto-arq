---
name: Arquitetura Multitenant
description: Manipulação de isolamento de dados e segurança estrutural usando `empresa_id` como identificador principal do inquilino (tenant).
---

# Arquitetura Multitenant
Esta habilidade gerencia o isolamento sistemático de dados dentro do aplicativo ArqPonto, garantindo que cada Escritório de Arquitetura (Empresa) veja apenas seus próprios dados.

## Regras Principais
1. **Filtragem Obrigatória**: Toda consulta ao banco de dados (Supabase) DEVE incluir um filtro para `empresa_id`.
2. **API Ciente do Contexto**: Use serviços para passar o `empresa_id` atual a partir do contexto de autenticação.
3. **Gestão Implícita de Inquilino**: Ao criar novos registros, o `empresa_id` DEVE ser atribuído automaticamente ao inquilino do usuário atual.

## Padrão de Implementação
### Serviços
Sempre passe o `empresa_id` para as funções de serviço ou recupere-o dos metadados do usuário ativo.

```typescript
// Correto
export const getProjetos = async (empresaId: string) => {
  const { data, error } = await supabase
    .from('projetos')
    .select('*')
    .eq('empresa_id', empresaId);
  return data;
};

// Incorreto
export const getAllProjetos = async () => {
  const { data, error } = await supabase.from('projetos').select('*');
  return data;
};
```

### Uso do Contexto
Use o `AuthContext` para gerenciar e fornecer o `empresa_id`.

```tsx
const { user } = useAuth();
const empresaId = user?.user_metadata?.empresa_id;
```

## Objetivos de Segurança
- **Row Level Security (RLS)**: Embora atualmente implementado manualmente na camada de serviço, o objetivo a longo prazo é ter políticas de RLS no Supabase que verifiquem `auth.jwt() -> 'empresa_id'`.
- **Validação Cruzada de Inquilinos**: Garanta que nenhum usuário possa passar um `empresa_id` arbitrário em uma carga de dados (payload) para visualizar ou modificar dados que não lhe pertencem.

## 🧪 Credenciais de Teste
> **IMPORTANTE**: Sempre que precisar testar funcionalidades no ambiente local, utilize as seguintes credenciais:

| Perfil | E-mail | Senha |
|---|---|---|
| **Colaborador** | `bruno.s.viana@gmail.com` | `Xbarra@002` |
| **Cliente** | `bruno.viana@hotmail.com` | `cliente123` |
