# Helldivers 2 War Dashboard

Dashboard em tempo real para acompanhar o status da guerra no jogo Helldivers 2 com dados 100% reais!

![Helldivers 2](https://img.shields.io/badge/Helldivers%202-War%20Dashboard-blue)
![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18.0+-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-4.18+-000000?logo=express)

## 🚀 Características

- ⚡ **Dados em tempo real** - Status da guerra atualizado diretamente da API oficial
- 🌍 **Campanhas ativas** - Todos os planetas em combate com progresso de liberação
- 🎯 **Major Orders** - Ordens principais ativas no jogo
- 📰 **Feed de notícias** - Últimas atualizações da guerra
- 📊 **Estatísticas detalhadas** - Número de jogadores, saúde dos planetas, facções
- 📱 **Interface responsiva** - Funciona em desktop e mobile
- 🎨 **Visual temático** - Design inspirado no jogo Helldivers 2
- 🔄 **Auto-refresh** - Atualização automática a cada 30 segundos

## 🛠️ Tecnologias

### Frontend
- **React 18** - Interface de usuário
- **Tailwind CSS** - Estilização moderna
- **Lucide React** - Ícones
- **Axios** - Cliente HTTP

### Backend  
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **CORS** - Habilitação de requisições cross-origin
- **Axios** - Proxy para API externa

## 🏗️ Arquitetura

```
Frontend (React) ←→ Backend (Express Proxy) ←→ Helldivers Training Manual API
```

O backend atua como proxy para contornar problemas de CORS e enriquecer os dados da API.

## 📦 Como rodar localmente

### Pré-requisitos

- **Node.js** 18.0+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

### Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/SEU-USUARIO/helldivers-dashboard.git
cd helldivers-dashboard
```

2. **Configure o backend:**
```bash
cd backend
npm install
```

3. **Configure o frontend:**
```bash
cd ../frontend
npm install
```

### Execução

Você precisa rodar **dois servidores simultaneamente**:

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```
✅ Servidor rodando em: `http://localhost:5000`

#### Terminal 2 - Frontend:
```bash
cd frontend
npm start
```
✅ Dashboard disponível em: `http://localhost:3000`

## 🌐 API Endpoints

O backend expõe os seguintes endpoints:

- `GET /api/war/status` - Status geral da guerra
- `GET /api/war/campaign` - Campanhas ativas
- `GET /api/war/major-orders` - Ordens principais
- `GET /api/war/news?limit=8` - Últimas notícias
- `GET /api/planets/:planetIndex` - Informações de planeta específico

## 📊 Fonte dos Dados

Todos os dados são obtidos em tempo real da [Helldivers Training Manual API](https://helldiverstrainingmanual.com/):

- **Campanhas ativas** - Planetas em combate no momento
- **Jogadores online** - Número real de Helldivers ativos
- **Progresso de liberação** - Porcentagem calculada com base na saúde dos planetas
- **Major Orders** - Objetivos principais ativos no jogo
- **Notícias** - Feed oficial de atualizações da guerra

## 🎮 Como usar

1. **Inicie os servidores** seguindo as instruções acima
2. **Acesse** `http://localhost:3000` no navegador
3. **Monitore** as campanhas ativas em tempo real
4. **Acompanhe** o progresso da liberação dos planetas
5. **Fique atualizado** com as Major Orders e notícias

## 🔧 Desenvolvimento

### Estrutura do projeto
```
helldivers-dashboard/
├── frontend/           # React app
│   ├── src/
│   │   ├── App.js     # Componente principal
│   │   └── index.css  # Estilos globais
│   └── public/
├── backend/           # Express server
│   ├── server.js     # Servidor proxy
│   └── package.json
├── README.md
└── .gitignore
```

### Scripts disponíveis

**Backend:**
- `npm start` - Produção
- `npm run dev` - Desenvolvimento (com nodemon)

**Frontend:**
- `npm start` - Servidor de desenvolvimento
- `npm run build` - Build para produção

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🎖️ Reconhecimentos

- **ArrowHead Game Studios** - Criadores do Helldivers 2
- **Helldivers Training Manual** - Fornecimento da API comunitária
- **Comunidade Helldivers** - Pelo suporte e feedback

## ⚡ Para a Democracia!

*"Super Earth's greatest weapon isn't our ships, our weapons, or our Stratagems. It's our citizens - and their willingness to sacrifice everything for freedom!"*

---

**Managed Democracy intensifies** 🇺🇸 🛡️ ⚡