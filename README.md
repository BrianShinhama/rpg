# 🤠 Deadrails — RPG do Oeste

Jogo multiplayer de sobrevivência no Velho Oeste. Até 4 jogadores por partida.

## Como jogar

1. Cada jogador entra com seu nome na tela inicial
2. No lobby, todos devem apertar **"Estou Pronto"**
3. A partida começa com a **loja de armas**
4. Combata inimigos clicando neles para atacar
5. Sobreviva às 5 rodadas e derrote o boss final!

## Estrutura das Rodadas

| Rodada | Capangas | Boss |
|--------|----------|------|
| 1 | Bêbados e ladrões | Black Pete |
| 2 | Pistoleiros recrutas | Mad Dog McGee |
| 3 | Bandoleiros + franco-atirador | Diamondback Dillo |
| 4 | Guardas da gangue | El Cuervo Rojo |
| 5 | Assassinos de elite | General Calamity |

## Setup Local (Desenvolvimento)

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` em múltiplas abas ou dispositivos na mesma rede.

O WebSocket funciona automaticamente em desenvolvimento local.

## Deploy para Multiplayer Real

### Railway (Recomendado — grátis)

1. Crie conta em [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Railway detecta Next.js automaticamente
4. **WebSocket funciona nativamente** — multiplayer completo

### Render

1. Crie conta em [render.com](https://render.com)
2. New Web Service → conecte o repo
3. Build: `npm run build` | Start: `npm start`
4. WebSocket suportado

### Vercel (Limitado)

O Vercel **não suporta WebSocket persistente** em funções serverless.
O jogo funcionará em **modo local** (um jogador por aba, mas compartilha estado via localStorage/BroadcastChannel — funciona em múltiplas abas no mesmo dispositivo).

Para multiplayer real no Vercel, seria necessário adicionar:
- Pusher / Ably (WebSocket as a service)
- PartyKit

## Armas Disponíveis

| Arma | Dano | Precisão | Custo |
|------|------|----------|-------|
| Soco Inglês | 3-7 | 90% | Grátis |
| Derringer | 8-14 | 75% | $30 |
| Colt .45 | 15-25 | 80% | $70 |
| Remington | 20-38 | 82% | $130 |
| Espingarda | 25-45 | 65% | $150 |
| Winchester | 30-50 | 88% | $220 |

## Itens de Cura

| Item | HP | Custo |
|------|----|-------|
| Erva do Deserto | +20 | $25 |
| Tônico do Doutor | +40 | $50 |
| Whiskey Puro | +65 | $80 |