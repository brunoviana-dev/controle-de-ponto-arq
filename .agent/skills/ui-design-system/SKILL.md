---
name: Sistema de Design UI
description: Diretrizes para manter uma estética premium e de alta conversão em todo o aplicativo ArqPonto.
---

# Sistema de Design UI
Esta habilidade define a linguagem visual, os padrões de componentes e a experiência de interação para o aplicativo ArqPonto.

## Princípios Core
1. **Comunicação em PT-BR**: Todas as respostas do agente no Antigravity e interações com o sistema DEVEM ser obrigatoriamente em Português (Brasil).
2. **Estética Dark Rica**: Use fundos em tons profundos de ardósia e carvão (#0f172a, #1e293b) com acentos primários vibrantes (#3b82f6).
3. **Glassmorphism**: Implemente efeitos sutis de transparência e desfoque (blur) em cartões e modais (`bg-surface/80 backdrop-blur-xl`).
4. **Tipografia**: Priorize fontes sans-serif modernas e legíveis (Inter, Segoe UI) com hierarquia de pesos adequada.
5. **Sombras Suaves**: Use sombras em múltiplas camadas para criar profundidade sem bordas duras.

## Paleta de Cores
- **Fundo (Background)**: `bg-[#0f172a]` (Slate 950)
- **Superfície (Surface)**: `bg-[#1e293b]` (Slate 800)
- **Primário**: `bg-blue-600` / `text-blue-500`
- **Secundário**: `bg-slate-700`
- **Sucesso**: `text-emerald-400`
- **Erro**: `text-rose-400`

## Padrão de Componentes
### Cartões (Cards)
Sempre use `rounded-2xl` e uma borda sutil.
```tsx
<div className="bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
  {/* Conteúdo */}
</div>
```

### Botões
Botões primários devem ter um gradiente sutil ou efeito de elevação no hover.
```tsx
<button className="bg-primary hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-all active:scale-95">
  Ação
</button>
```

### Campos de Senha (Inputs)
Para garantir uma boa usabilidade, **todos os campos de entrada de senha** (password fields) DEVEM obrigatoriamente possuir um botão de alternância (toggle) com o ícone de visualização (olhinho).
- O ícone (Eye/EyeOff) deve estar posicionado à direita, dentro do campo.
- A funcionalidade deve permitir que o usuário alterne entre ver a senha (`text`) e ocultá-la (`password`).

## Ícones
Use Lucide React ou ícones SVG de traço fino para manter a sensação de clareza arquitetônica.

## Layout
- Use containers `max-w-7xl` consistentes para o conteúdo principal.
- Padronize o preenchimento (padding) no mobile (`px-4`) vs desktop (`px-8`).

## Padrões de Localização (Brasil)
Para garantir a melhor experiência para o usuário brasileiro, aplique as seguintes formatações em toda a UI:

1.  **Moeda (BRL)**: Valores monetários devem usar o símbolo `R$` e o formato brasileiro (ponto para milhar, vírgula para decimal).
    - Exemplo: `R$ 2.500,00`
2.  **Telefones**: Formato fixo com DDD entre parênteses.
    - Padrão: `(XX) XXXXX-XXXX`
3.  **Documentos**:
    - **CPF**: `XXX.XXX.XXX-XX`
    - **CNPJ**: `XX.XXX.XXX/XXXX-XX`
4.  **Datas**: Devem ser exibidas no formato brasileiro.
    - Padrão: `DD/MM/YYYY` (Dia/Mês/Ano).
    - Evite formatos americanos ou ISO na exibição final para o usuário.

Sempre que possível, utilize as funções utilitárias do projeto (ex: em `utils/formataMoeda.ts` ou similares) para consistência total.

## 🧪 Credenciais de Teste
> **IMPORTANTE**: Sempre que precisar testar funcionalidades no ambiente local, utilize as seguintes credenciais:

| Perfil | E-mail | Senha |
|---|---|---|
| **Colaborador** | `bruno.s.viana@gmail.com` | `Xbarra@002` |
| **Cliente** | `bruno.viana@hotmail.com` | `cliente123` |
