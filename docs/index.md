# Cockpit ITSS — Documentação da Plataforma

O **Cockpit ITSS** é uma plataforma de gestão multi-tenant para gerenciar organizações, contas, soluções, usuários, grupos, componentes e autorização granular (Fine-Grained Authorization — FGA). Esta é uma versão PoC (Proof of Concept) com dados mockados e autorização simulada.

---

## O que é o Cockpit?

O Cockpit centraliza o gerenciamento de acesso e configuração dos módulos da plataforma PAS (Plataforma ITSS). Ele permite que:

- **Plataforma** gerencie organizações, componentes e arquitetos
- **Organizações** gerenciem suas contas, usuários, grupos e contratos
- **Contas** gerenciem quem acessa quais módulos e com quais permissões

---

## Quem usa o Cockpit?

Existem **5 papéis de plataforma**, cada um com acesso diferente:

| Papel | Quem é | O que faz no Cockpit |
|-------|--------|----------------------|
| **Platform Admin** | Equipe ITSS | Gerencia tudo: orgs, componentes, arquitetos |
| **Org Admin** | Gestor da organização cliente | Gerencia contas, usuários, grupos e contratos da sua org |
| **PAS Architect** | Arquiteto técnico ITSS | Gerencia componentes da plataforma; não vê dados de clientes |
| **Account Admin** | Gestor de uma conta específica | Gerencia usuários e permissões dentro da conta |
| **Member** | Usuário final | Acesso básico de leitura |

Para testes, use o **PersonaSwitcher** no canto inferior direito da tela — ele permite trocar entre as 5 personas sem necessidade de login.

---

## Módulos Documentados

Os três cenários principais da plataforma são:

1. **DocNix** — MaxDoc (gestão de documentos) e DocAction (gestão de ocorrências/ações de qualidade)
2. **Assistente** — Assistente de IA com acesso controlado por ações granulares
3. **PayMirun** — Módulo de pagamentos *(implementação futura)*

---

## Estrutura desta Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [01-arquitetura.md](./01-arquitetura.md) | Stack tecnológico, request flow, estrutura de pastas |
| [02-dominio.md](./02-dominio.md) | Modelo de entidades, relacionamentos, banco de dados |
| [03-autorizacao.md](./03-autorizacao.md) | Modelo FGA, papéis, permissões, entitlements |
| [04-paginas-e-fluxos.md](./04-paginas-e-fluxos.md) | Guia de UI por página, fluxos principais, sheets |
| [05-api.md](./05-api.md) | Referência completa dos endpoints REST |
| [06-cenarios-teste.md](./06-cenarios-teste.md) | Cenários de teste DocNix, Assistente passo a passo |
| [07-criterios-aceite.md](./07-criterios-aceite.md) | Critérios de aceite por módulo |

---

## Como rodar localmente

```bash
# Instalar dependências
npm install

# Iniciar frontend (porta 5173) + backend (porta 3001) simultaneamente
npm run dev        # Vite SPA
npm run dev:server # Hono API com hot reload

# Banco de dados (Neon)
npm run db:push    # Aplica schema
npm run db:seed    # Popula com dados de teste
npm run db:studio  # Abre Drizzle Studio (visualizador)

# Build para produção
npm run build
```

> **Atenção:** Frontend e backend devem rodar simultaneamente durante o desenvolvimento. O Vite proxeia `/api/*` para a porta 3001.
