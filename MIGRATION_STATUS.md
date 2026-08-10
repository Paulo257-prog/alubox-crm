# ALUBOX CRM — Status da migração para Next.js + Supabase

Este documento é a fonte da verdade sobre o que está pronto e o que não está.

## 1. Pendências resolvidas nesta rodada

| Pendência | O que foi feito |
|---|---|
| **Materiais**: pickers "+ Novo" | Material (catálogo), Categoria e Fornecedor agora são seletores reais com "+ Novo"/"+ Nova" — abrem modal, salvam, atualizam a lista e selecionam automaticamente o novo registro, preservando o resto do formulário |
| **Financeiro**: picker "+ Nova categoria" | Campo Categoria virou seletor + "+ Nova categoria", mesmo padrão |
| **Configurações → Catálogos** | Tela nova com 6 seções: Categorias de materiais, Categorias financeiras, Especialidades, Fornecedores, Catálogo de materiais, Catálogo de serviços — visualizar, criar, editar e alternar Ativo/Inativo em cada uma |
| **Exclusão destrutiva bloqueada** | Um catálogo vinculado a alguma obra não pode ser excluído — o Postgres recusa (chave estrangeira sem `on delete cascade`, já existia desde a migration 0001) e a tela mostra uma mensagem pedindo para desativar em vez de excluir |
| **3 relatórios que faltavam** | "Obras por período", "Faturamento" (gráfico mensal) e "Prestadores mais utilizados" (ranking) foram adicionados — os 7 relatórios do protótipo agora existem. "Obras por etapa" também foi corrigido para usar o gráfico de pizza original (antes tinha virado uma tabela por engano) |
| **Filtro por cliente nos relatórios** | Adicionado nos relatórios "Por período", "Finalizadas" e "Atrasadas" |
| **Bug: especialidade do prestador não salvava ao editar** | Causa raiz encontrada: `updatePrestador` mandava o patch direto pro banco sem resolver o nome da especialidade (ex: "Eletricista") para o `especialidade_id` que a coluna espera — e o componente nem chegava a enviar o campo. Corrigido nos dois pontos: o service agora resolve automaticamente, e o formulário agora envia o campo. Depois de salvar, a lista de prestadores é recarregada e a mudança aparece na hora |
| **Migration 0004** (nova) | Adiciona a coluna `ativo` aos 6 catálogos e as políticas de RLS de UPDATE que faltavam para editá-los |
| **Correção extra encontrada na auditoria** | GESTOR tinha permissão de "Gerenciar catálogos" na matriz, mas a tela de Configurações (onde os catálogos ficam) estava travada só para ADMINISTRADOR — corrigido: GESTOR agora acessa Configurações, mas só ADMINISTRADOR vê a seção de Usuários |

## 2. Auditoria estrutural — o que foi checado e como

Não consigo rodar `next build` de verdade (sem internet neste ambiente, sem `next`
instalado — reconfirmado nesta rodada). O que fiz, e é real, desta vez com um
checador a mais:

| Checagem | Resultado |
|---|---|
| Sintaxe de cada arquivo `.ts`/`.tsx` (parser do esbuild) | **52/52 arquivos válidos** |
| Imports internos (`@/...`) resolvendo para arquivo existente | **80/80 resolvidos** |
| Nomes importados batendo com exports reais do arquivo de origem | **145/145 corretos** |
| **Novo**: propriedades desestruturadas de `useAlubox()` existindo de fato no hook | **79/79 corretas** — esse checador foi criado nesta rodada porque os anteriores não pegavam uma ação inexistente usada por um componente (ex: chamar uma função que não existe no hook central) |
| Rotas com `export default` (páginas) / export nomeado por método HTTP (rotas de API) | Todas corretas |
| Permissões: toda string usada em `can(currentUser, "...")` existe no tipo `Permission` | 7/7 — nenhuma checagem de permissão "fantasma" |

O que isso ainda não cobre: erros de tipo do TypeScript, comportamento em
tempo de execução contra um banco Supabase real, nem nada específico do
compilador do Next.js.

## 3. Pendências que ainda existem (menores, não bloqueiam a próxima etapa)

- A avaliação de prestador (estrelas) não passou por auditoria de permissão
  fina — hoje qualquer usuário com permissão de "editar" pode alterar,
  mesmo não sendo quem cadastrou.
- Não portei a "Zona de risco" (apagar todos os dados) que existia no
  protótipo — decisão deliberada: um apagamento em massa via Supabase
  merece sua própria proteção (dupla confirmação, talvez log de auditoria)
  em vez de simplesmente copiar o botão do protótipo.
- Filtros de relatório ainda não incluem prestador/status (só cliente foi
  adicionado, que era o filtro mais claramente aplicável aos relatórios
  existentes).

## 4. O projeto está pronto para a próxima etapa (conectar Supabase/Vercel)?

Sim, dentro do que é possível confirmar sem instalar as dependências reais:
o código está estruturalmente consistente (imports, exports, tipos, rotas,
permissões todos auditados), as 4 pendências pedidas foram corrigidas e
verificadas por leitura de código, e a migration 0004 está pronta para
rodar junto com as outras 3. A confirmação final de que "roda de verdade"
só acontece com `npm install && npm run build` num ambiente com internet —
esse é o próximo passo técnico, antes ou junto da conexão com Supabase.
