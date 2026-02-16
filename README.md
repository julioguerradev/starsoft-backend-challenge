# Sistema de Venda de Ingressos de Cinema

Sistema de venda de ingressos para rede de cinemas desenvolvido com NestJS, focado em alta concorrência e arquiteturas escaláveis.

## Visão Geral

Este sistema foi desenvolvido para lidar com o desafio de múltiplos usuários tentando comprar os mesmos assentos simultaneamente, garantindo que nenhum assento seja vendido duas vezes através de controle de concorrência distribuído com Redis locks, processamento assíncrono com RabbitMQ e arquitetura robusta.

### Principais Funcionalidades

- Gestão de sessões de cinema (filmes, horários, salas, assentos)
- Reserva de assentos com controle de concorrência distribuído
- Expiração automática de reservas não confirmadas (30 segundos)
- Confirmação de pagamento e conversão de reserva em venda
- Histórico de compras por usuário
- Logging estruturado de todas as operações
- Processamento assíncrono de eventos via RabbitMQ

## Tecnologias Escolhidas

### Core

- **Node.js 22 + NestJS 11**: Framework progressivo para aplicações escaláveis
- **TypeScript**: Type safety e melhor manutenibilidade
- **Prisma ORM**: Type-safe database access e migrations

### Banco de Dados

- **PostgreSQL 15**: Banco de dados relacional
  - **Por quê?** ACID compliance, suporte robusto a transações, performance excelente para leitura/escrita simultânea
  - **Uso**: Armazenamento principal de sessões, assentos, reservas e vendas

### Cache Distribuído

- **Redis 7**: In-memory data structure store
  - **Por quê?** Suporte nativo a locks distribuídos, alta performance, TTL automático
  - **Uso**: Locks distribuídos para controle de concorrência nos assentos

### Sistema de Mensageria

- **RabbitMQ 3.12**: Message broker
  - **Por quê?** Confiabilidade, suporte a dead letter queues, acknowledgments, persistência de mensagens
  - **Uso**: Eventos assíncronos (reserva criada, pagamento confirmado, reserva expirada)

### Infraestrutura

- **Docker + Docker Compose**: Containerização e orquestração local
- **ESLint + Prettier**: Qualidade e consistência de código

## Como Executar

### Pré-requisitos

- Docker e Docker Compose instalados
- Porta 3000, 5432, 6379, 5672 e 15672 livres

### Iniciar o Ambiente

```bash
# Clonar o repositório
git clone <seu-repositorio>
cd starsoft-backend-challenge

# Subir todos os serviços (PostgreSQL, Redis, RabbitMQ e API)
docker-compose up --build
```

A aplicação estará disponível em:
- **API**: http://localhost:3000/api
- **Swagger (documentação)**: http://localhost:3000/api/api-docs

### Popular Dados Iniciais

O seed é executado automaticamente na inicialização. Ele cria 3 sessões de cinema com 16 assentos cada:

1. Avatar: O Caminho da Água - Sala 1 - R$ 25,00
2. Homem-Aranha: Através do Aranhaverso - Sala 2 - R$ 28,00
3. Oppenheimer - Sala 3 - R$ 30,00

### Executar Testes

```bash
# Testes unitários (quando implementados)
npm run test

# Teste de concorrência
node test-concurrency.js
```

## Estratégias Implementadas

### 1. Como Resolvemos Race Conditions

**Problema:** Dois usuários clicam no último assento disponível no mesmo milissegundo.

**Solução:**

- **Locks Distribuídos com Redis**: Antes de reservar um assento, o sistema adquire um lock exclusivo no Redis com a chave `lock:seat:lock:{sessionId}:{seatId}`
- **TTL Automático**: O lock expira automaticamente após 5 segundos, prevenindo locks órfãos
- **Retry com Backoff**: Sistema tenta adquirir o lock até 3 vezes com delay de 100ms entre tentativas
- **Transações no Banco**: Atualização do status do assento e criação da reserva em transação atômica

```typescript
// Fluxo de reserva com lock
1. Tentar adquirir lock no Redis (key: seat:lock:1:5, ttl: 5s)
2. SE lock adquirido:
   a. Verificar disponibilidade no banco (status = AVAILABLE)
   b. Criar reserva em transação
   c. Atualizar status do assento para RESERVED
   d. Liberar lock
3. SENÃO: Retry ou falhar após 3 tentativas
```

### 2. Como Garantimos Coordenação Entre Múltiplas Instâncias

**Problema:** Aplicação rodando em múltiplas instâncias precisa coordenar acesso aos assentos.

**Solução:**

- **Redis Centralizado**: Todas as instâncias compartilham a mesma instância Redis
- **Locks Distribuídos**: Independente da instância, o lock no Redis garante exclusividade
- **RabbitMQ**: Eventos são processados de forma distribuída e confiável
- **Stateless**: Aplicação não mantém estado local, tudo é armazenado em PostgreSQL/Redis

### 3. Como Prevenimos Deadlocks

**Problema:** Usuário A reserva assentos 1 e 3, Usuário B reserva assentos 3 e 1 simultaneamente.

**Solução:**

- **Timeout nos Locks**: Locks expiram automaticamente após 5 segundos
- **Ordem Consistente**: Locks são sempre adquiridos na ordem dos IDs dos assentos
- **Falha Rápida**: Se não conseguir o lock após 3 tentativas, a operação falha imediatamente
- **Transações Curtas**: Locks são mantidos apenas durante a operação crítica

### 4. Edge Cases Considerados

#### Idempotência

**Cenário:** Cliente reenvia mesma requisição por timeout.

**Solução:** Verificamos se o usuário já possui reserva ativa para aquele assento antes de criar nova.

```typescript
const existingReservation = await prisma.reservation.findFirst({
  where: { sessionId, seatId, userId, status: 'PENDING', expiresAt: { gt: new Date() } }
});
```

#### Expiração de Reservas

**Cenário:** Usuário reserva mas não paga em 30 segundos.

**Solução:**
- Worker executa a cada 5 segundos (cron job)
- Busca reservas com `status = PENDING` e `expiresAt < now`
- Atualiza status para EXPIRED
- Libera assento (status = AVAILABLE)
- Publica evento `reservation.expired`

#### Lock Órfão

**Cenário:** Aplicação crasha enquanto mantém lock.

**Solução:** TTL do Redis (5 segundos) garante liberação automática do lock.

#### Falha no RabbitMQ

**Cenário:** RabbitMQ está indisponível temporariamente.

**Solução:**
- Aplicação registra erro mas continua funcionando
- Reconnection automático com retry (biblioteca `amqp-connection-manager`)
- Mensagens são persistentes e sobrevivem a restart

## Endpoints da API

> **Documentação interativa**: Acesse **http://localhost:3000/api/api-docs** para testar os endpoints via Swagger UI.

### Sessões

```http
# Criar sessão (exemplo completo no bloco abaixo)
POST /api/sessions

# Atualizar sessão (campos opcionais)
PATCH /api/sessions/:id
Content-Type: application/json

{
  "movieName": "Novo Nome do Filme",
  "price": 30.00
}

# Listar todas as sessões
GET /api/sessions

# Obter sessão específica
GET /api/sessions/:id

# Ver assentos disponíveis (tempo real)
GET /api/sessions/:id/seats
```

### Reservas

```http
# Criar reserva
POST /api/reservations
Content-Type: application/json

{
  "sessionId": 1,
  "seatIds": [1, 2],
  "userId": "user123"
}

Response:
{
  "reservations": [
    {
      "id": 1,
      "sessionId": 1,
      "seatId": 1,
      "userId": "user123",
      "status": "PENDING",
      "expiresAt": "2026-02-15T20:00:30.000Z",
      "createdAt": "2026-02-15T20:00:00.000Z",
      "seat": { "seatNumber": "A1", "row": "A" }
    }
  ],
  "expiresAt": "2026-02-15T20:00:30.000Z",
  "message": "2 assento(s) reservado(s) com sucesso"
}

# Consultar reserva
GET /api/reservations/:id

# Adicionar assentos a reserva existente
PATCH /api/reservations/:id/seats?userId=user123
Content-Type: application/json

{
  "seatIds": [3, 4]
}

# Cancelar reserva
DELETE /api/reservations/:id?userId=user123

# Buscar reservas do usuário
GET /api/reservations/user/:userId
```

### Vendas

```http
# Confirmar pagamento
POST /api/sales/confirm
Content-Type: application/json

{
  "reservationId": 1,
  "userId": "user123"
}

Response:
{
  "sales": [
    {
      "id": 1,
      "sessionId": 1,
      "seatId": 1,
      "userId": "user123",
      "price": 25.00,
      "createdAt": "2026-02-15T20:00:15.000Z",
      "seat": { "seatNumber": "A1", "row": "A" },
      "session": {
        "movieName": "Avatar 3",
        "roomNumber": "Sala 1",
        "startTime": "2026-02-20T19:00:00.000Z"
      }
    }
  ],
  "totalPrice": 50.00,
  "message": "Pagamento confirmado com sucesso! 2 ingresso(s) comprado(s)."
}

# Histórico de compras por usuário
GET /api/sales/user/:userId

# Listar todas as vendas (admin)
GET /api/sales
```

## Decisões Técnicas

### 1. Por que Redis para Locks?

**Alternativas consideradas:** Pessimistic locking no PostgreSQL, optimistic locking com versioning

**Escolha:** Redis Distributed Locks

**Justificativa:**
- Performance superior (in-memory)
- TTL nativo previne locks órfãos
- Não bloqueia transações no banco principal
- Escalável horizontalmente com Redis Cluster (futuro)

### 2. Por que RabbitMQ ao invés de Kafka?

**Justificativa:**
- Menor complexidade operacional para este caso de uso
- Suporte nativo a acknowledgments e retry
- Dead Letter Queue out-of-the-box
- Suficiente para o volume esperado de mensagens

### 3. Por que Prisma ORM?

**Justificativa:**
- Type-safety end-to-end
- Migrations versionadas
- Query builder intuitivo
- Excelente suporte a transações

### 4. Arquitetura de Módulos

**Separação por domínio:**
- `infrastructure/`: Serviços de infraestrutura (Prisma, Redis, RabbitMQ)
- `modules/`: Módulos de negócio (Sessions, Reservations, Sales)
- `common/`: Utilitários compartilhados (filters, interceptors, exceptions)

**Princípios SOLID aplicados:**
- Single Responsibility: Cada service tem responsabilidade única
- Open/Closed: Extensível via decorators e interfaces
- Dependency Inversion: Injeção de dependências do NestJS

## Limitações Conhecidas

### 1. Sem Autenticação/Autorização
**O que falta:** JWT, roles, guards
**Por quê:** Foco no controle de concorrência conforme requisitos
**Impacto:** Qualquer usuário pode acessar qualquer endpoint

### 2. Sem Dead Letter Queue
**O que falta:** Mensagens com falha vão para DLQ após X tentativas
**Por quê:** Requer configuração adicional no RabbitMQ
**Impacto:** Mensagens problemáticas podem ficar em retry infinito

### 3. Sem Testes Automatizados
**O que falta:** Testes unitários e de integração
**Por quê:** Priorização do desenvolvimento funcional
**Impacto:** Confiança menor em refactorings futuros

### 4. Rate Limiting Básico
**O que falta:** Throttling por IP/usuário
**Por quê:** Não era requisito obrigatório
**Impacto:** Sistema vulnerável a abuse/DoS

## Melhorias Futuras

### Curto Prazo

1. **Testes Automatizados**
   - Unit tests com cobertura de 70%+
   - Integration tests para fluxos críticos
   - E2E tests para cenários de concorrência

2. **Observabilidade**
   - Métricas
   - Tracing distribuído
   - Dashboard

### Médio Prazo

3. **Dead Letter Queue**
   - Mensagens problemáticas isoladas
   - Retry com backoff exponencial
   - Alertas para falhas recorrentes

4. **Autenticação e Autorização**
   - JWT authentication
   - RBAC (Customer, Admin, Manager)
   - API Keys para integrações

5. **Cache de Queries**
   - Cache de sessões disponíveis
   - Cache de disponibilidade de assentos
   - Invalidação inteligente

### Longo Prazo

6. **Escala Horizontal**
   - Redis Cluster para locks
   - PostgreSQL Read Replicas
   - Load balancer

7. **Multi-tenancy**
   - Suporte a múltiplas redes de cinema
   - Isolamento de dados
   - Customização por tenant

8. **Notificações**
   - Email de confirmação de compra
   - SMS de lembrete da sessão
   - Push notifications mobile

## Exemplo de Fluxo para Testar

### Teste Manual

```bash
# 1. Listar sessões disponíveis
curl http://localhost:3000/api/sessions

# 2. Ver assentos disponíveis de uma sessão
curl http://localhost:3000/api/sessions/1/seats

# 3. Criar reserva (Usuário 1)
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "seatIds": [1, 2],
    "userId": "user1"
  }'

# 4. Tentar reservar mesmo assento (Usuário 2) - Deve falhar
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "seatIds": [1],
    "userId": "user2"
  }'

# 5. Confirmar pagamento dentro de 30 segundos
curl -X POST http://localhost:3000/api/sales/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": 1,
    "userId": "user1"
  }'

# 6. Ver histórico de compras
curl http://localhost:3000/api/sales/user/user1
```

### Teste de Concorrência Automatizado

```bash
# Executa teste simulando 10 usuários tentando reservar o mesmo assento
node test-concurrency.js
```

**Resultado esperado:**
- Apenas 1 usuário consegue reservar
- 9 usuários recebem erro de conflito
- Logs mostram locks sendo adquiridos e liberados

## Monitoramento

### Logs Estruturados

Todos os serviços logam eventos importantes:

```
[HTTP] 📨 POST /api/reservations - User-Agent: ...
[ReservationsService] Iniciando reserva - Sessão: 1, Assentos: 1,2, Usuário: user1
[RedisService] Lock adquirido: lock:seat:lock:1:1
[ReservationsService] Reserva criada com sucesso: ID 1, Assento 1
[RedisService] Lock liberado: lock:seat:lock:1:1
[RabbitMQService] Evento publicado: reservation.created na fila reservation.created
[HTTP] ✅ POST /api/reservations - 245ms
```

### RabbitMQ Management

Acesse: **http://localhost:15672**
- Username: `ticketsuser`
- Password: `ticketspass`

Monitore:
- Filas e mensagens pendentes
- Taxa de publicação/consumo
- Connections ativas

## Conclusão

Este sistema demonstra uma implementação robusta de controle de concorrência distribuído, garantindo que nenhum assento seja vendido duas vezes mesmo sob alta carga. As escolhas técnicas foram feitas priorizando confiabilidade, escalabilidade e manutenibilidade.

O código segue princípios SOLID, utiliza logging estruturado, tratamento adequado de erros e está preparado para escalar horizontalmente quando necessário.