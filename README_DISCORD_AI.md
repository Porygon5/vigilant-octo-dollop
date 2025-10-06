# 🤖 Discord AI Controller

Bot Telegram avec IA pour contrôler Discord - Interface stylée et fonctionnalités avancées !

## 🚀 Fonctionnalités

### ✨ Interface Telegram Stylée
- 🎯 Menu principal interactif avec boutons
- 💬 Chat IA naturel
- 📊 Dashboard en temps réel
- ⚡ Actions rapides
- 🎨 Interface moderne et intuitive

### 🧠 Intelligence Artificielle
- 🤖 OpenAI GPT-3.5-turbo intégré
- 💰 Optimisé pour les coûts (300k+ requêtes pour 5$)
- 🧠 Compréhension du langage naturel
- ⚡ Cache intelligent pour économiser les tokens
- 🎯 Commandes automatiques

### 🎮 Contrôle Discord Complet
- 💬 Envoyer/répondre aux messages
- ⌨️ Statut "en train d'écrire"
- 📩 Messages privés
- 👍 Réactions aux messages
- 🏠 Gestion des serveurs
- 📊 Surveillance en temps réel
- 📎 Upload de fichiers
- 🎤 Channels vocaux

## 🛠️ Installation

### Prérequis
- Node.js v20.18+
- Token Discord
- Token Telegram Bot
- Clé API OpenAI

### Installation
```bash
# Cloner le projet
git clone <repository>
cd discord-ai-controller

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp config.example.env config.env
# Éditer config.env avec vos tokens
```

### Configuration
```env
# Discord Configuration
DISCORD_TOKEN=votre_token_discord

# Telegram Configuration  
TELEGRAM_TOKEN=votre_token_telegram

# OpenAI Configuration
OPENAI_API_KEY=votre_clé_openai

# AI Configuration (Optimisé pour coûts)
AI_MODEL=gpt-3.5-turbo
AI_MAX_TOKENS=150
AI_TEMPERATURE=0.7
```

## 🚀 Utilisation

### Démarrage
```bash
# Démarrage principal
npm start

# Mode développement
npm run dev

# Extraction DMs (ancien script)
npm run dm-extractor
```

### Commandes Telegram

#### Menu Principal
- `/start` - Démarrer le bot
- `/menu` - Menu principal interactif
- `/status` - Statut Discord
- `/help` - Aide complète

#### Commandes IA Naturelles
```
"Répond 'salut' à Anthony0707"
"Envoie un message sur le serveur Gaming"
"Montre les derniers messages"
"Réagis avec 👍 au dernier message"
"Dis à @admin de venir"
```

### Interface Web
- 🌐 Dashboard: `http://localhost:3000`
- 📊 Statistiques: `http://localhost:3000/stats`
- 🔧 Contrôle: `http://localhost:3000/control`

## 💰 Optimisation Coûts

### Stratégies d'économie
- **GPT-3.5-turbo** au lieu de GPT-4 (10x moins cher)
- **Tokens limités** (max 150 par réponse)
- **Cache intelligent** pour éviter les requêtes répétitives
- **Fallback local** pour commandes simples
- **Requêtes groupées** quand possible

### Estimation coûts
- ~300,000 requêtes pour 5$
- ~0.000002$ par requête
- Cache réduit les coûts de 30-50%

## 🎯 Fonctionnalités Avancées

### Contrôle Discord
```javascript
// Envoyer un message
await discordController.sendMessage('channel_id', 'Contenu');

// Envoyer un DM
await discordController.sendDMToUser('username', 'Message');

// Statut typing
await discordController.startTyping();
await discordController.stopTyping();

// Réactions
await discordController.reactToLastMessage('👍');
```

### Processeur IA
```javascript
// Traitement commande naturelle
const result = await aiProcessor.processCommand(
    "Répond 'salut' à Anthony0707"
);

// Statistiques
const stats = aiProcessor.getStats();
```

### Bot Telegram
```javascript
// Interface stylée
bot.showMainMenu(chatId);
bot.showDiscordStatus(chatId);
bot.startAIChat(chatId);
```

## 🔧 Architecture

```
Telegram Bot (Interface) 
    ↓
AI Processor (OpenAI)
    ↓  
Discord Controller (Selfbot)
    ↓
Discord API
```

### Composants
- **`app.js`** - Application principale
- **`telegramBot.js`** - Interface Telegram stylée
- **`aiProcessor.js`** - Processeur IA optimisé
- **`discordController.js`** - Contrôleur Discord
- **`config.env`** - Configuration

## 🛡️ Sécurité

### Bonnes pratiques
- ✅ Variables d'environnement pour les tokens
- ✅ Validation des entrées
- ✅ Gestion d'erreurs robuste
- ✅ Limites de taux
- ✅ Logs sécurisés

### Limitations
- ⚠️ Selfbots contre les ToS Discord
- ⚠️ Utilisation à vos propres risques
- ⚠️ Limites de coûts IA

## 📊 Monitoring

### Statistiques disponibles
```bash
# Via API
curl http://localhost:3000/stats

# Via logs
tail -f logs/app.log
```

### Métriques
- Requêtes IA utilisées/restantes
- Coût estimé
- Cache hits
- Statut Discord
- Messages traités

## 🐛 Dépannage

### Problèmes courants
```bash
# Discord non connecté
- Vérifier le token
- Vérifier la connexion internet
- Vérifier les permissions

# IA non fonctionnelle  
- Vérifier la clé API OpenAI
- Vérifier les crédits
- Vérifier les limites

# Telegram non fonctionnel
- Vérifier le token bot
- Vérifier les permissions bot
- Vérifier la configuration webhook
```

### Logs
```bash
# Logs détaillés
DEBUG=* npm start

# Logs spécifiques
DEBUG=discord:*,telegram:* npm start
```

## 🚀 Développement

### Structure du projet
```
discord-ai-controller/
├── app.js                 # Application principale
├── telegramBot.js         # Interface Telegram
├── aiProcessor.js         # Processeur IA
├── discordController.js   # Contrôleur Discord
├── config.env            # Configuration
├── package.json          # Dépendances
└── README.md            # Documentation
```

### Ajout de fonctionnalités
1. Modifier le contrôleur Discord
2. Ajouter les commandes IA
3. Mettre à jour l'interface Telegram
4. Tester et documenter

## 📝 Exemples

### Commandes populaires
```
# Messages
"Répond 'ok' à John"
"Envoie 'salut tout le monde' sur #general"

# Actions
"Montre les derniers messages"
"Réagis avec ❤️ au dernier message"
"Active le statut typing"

# Informations
"Quel est mon statut Discord ?"
"Montre-moi mes serveurs"
"Combien de messages ai-je envoyé ?"
```

## 🤝 Contribution

Les contributions sont les bienvenues !
- 🐛 Signaler des bugs
- ✨ Proposer des fonctionnalités
- 📝 Améliorer la documentation
- 🔧 Optimiser les performances

## 📄 Licence

MIT License - Utilisation à vos propres risques

---

**⚠️ Avertissement :** L'utilisation de selfbots peut violer les Conditions d'Utilisation de Discord. Utilisez ce bot à vos propres risques.

**💰 Coûts :** Optimisé pour durer 300k+ requêtes avec 5$ d'OpenAI.

**🎮 Fonctionnalités :** Interface stylée, IA naturelle, contrôle complet Discord !
