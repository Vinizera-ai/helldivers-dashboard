# Helldivers 2 War Dashboard

Dashboard em tempo real para acompanhar o status da guerra no jogo Helldivers 2.

## 🚀 Características

- ⚡ Status da guerra em tempo real
- 🌍 Campanhas ativas nos planetas
- 🎯 Ordens principais (Major Orders)
- 📰 Feed de notícias da guerra
- 📱 Interface responsiva
- 🎨 Visual inspirado no jogo

## 🛠️ Tecnologias

- **Frontend**: React, Tailwind CSS, Lucide React
- **API**: Helldivers Training Manual API
- **HTTP Client**: Axios

## 📦 Como rodar localmente

### Pré-requisitos

- Node.js (versão LTS)
- Git

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/SEU-USUARIO/helldivers-dashboard.git
cd helldivers-dashboard
```

2. Instale as dependências:
```bash
cd frontend
npm install
```

3. Execute o projeto:
```bash
npm start
```

4. Abra [http://localhost:3000](http://localhost:3000) no navegador

## 🌐 API

O dashboard consome dados da [Helldivers Training Manual API](https://helldiverstrainingmanual.com/):

- `/api/v1/war/status` - Status atual de todos os planetas
- `/api/v1/war/campaign` - Lista de campanhas ativas
- `/api/v1/war/major-orders` - Ordens principais ativas
- `/api/v1/war/news` - Feed de notícias da guerra

## 📱 Screenshots

![Dashboard](screenshot.png)

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## ⚡ Para a Democracia!

Este projeto é dedicado a tous os Helldivers que lutam pela liberdade e democracia em toda a galáxia! 🇺🇸