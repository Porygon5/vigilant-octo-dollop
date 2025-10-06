# 🔧 Guide de Dépannage - Discord AI Controller

## 🚨 Problèmes Courants et Solutions

### 1. **Erreur Telegram 409 - "terminated by other getUpdates request"**

**Problème :** Une autre instance du bot est déjà en cours d'exécution.

**Solutions :**
```bash
# Arrêter tous les processus Node.js
pkill -f "node app.js"

# Ou redémarrer WSL
wsl --shutdown
wsl

# Puis relancer
npm start
```

### 2. **Erreur Telegram 400 - "can't parse entities"**

**Problème :** Erreur de parsing Markdown dans les messages.

**Solution :** ✅ **Corrigé automatiquement** - Le bot utilise maintenant un système d'échappement des caractères spéciaux.

### 3. **Erreur Discord "404: Not Found"**

**Problème :** Tentative d'accès à des channels non disponibles.

**Solution :** ✅ **Corrigé automatiquement** - Les scripts utilisent maintenant le cache Discord au lieu d'API calls.

### 4. **Erreur OpenAI "insufficient_quota"**

**Problème :** Crédits OpenAI épuisés.

**Solutions :**
- Vérifier votre quota sur [OpenAI Platform](https://platform.openai.com/usage)
- Ajouter des crédits si nécessaire
- Le bot continue de fonctionner sans IA (mode basique)

### 5. **Node.js Version Incompatible**

**Problème :** `ReferenceError: File is not defined`

**Solution :**
```bash
# Vérifier la version Node.js
node --version

# Doit être >= 20.18
# Si problème, mettre à jour Node.js dans WSL
```

## 🛠️ Commandes Utiles

### Tests et Diagnostic
```bash
# Test simple du système
npm test

# Extraction DM simple
npm run dm-extractor

# Extraction DM avancée
npm run dm-advanced

# Arrêt propre
npm run stop
```

### Logs et Debug
```bash
# Lancer en mode développement
npm run dev

# Vérifier les logs
tail -f logs/discord-ai.log
```

## 🔍 Diagnostic Avancé

### Vérifier les Connexions
```bash
# Test connexion Discord
node -e "
const DiscordController = require('./discordController');
const discord = new DiscordController(process.env.DISCORD_TOKEN);
discord.connect().then(() => console.log('✅ Discord OK')).catch(e => console.error('❌ Discord:', e.message));
"
```

### Vérifier les Variables d'Environnement
```bash
# Vérifier config.env
cat config.env | grep -E "^(DISCORD_TOKEN|TELEGRAM_BOT_TOKEN|OPENAI_API_KEY)"
```

## 📞 Support

Si les problèmes persistent :

1. **Vérifiez les logs** dans la console
2. **Redémarrez WSL** complètement
3. **Vérifiez vos tokens** (Discord, Telegram, OpenAI)
4. **Testez chaque composant** individuellement

## 🎯 Statuts Normaux

- ✅ Discord connecté
- ✅ Bot Telegram actif  
- ✅ IA configurée
- 🌐 Serveur web sur port 3000

## ⚠️ Notes Importantes

- **Un seul bot Telegram** peut tourner à la fois
- **Les tokens expirent** - renouvelez si nécessaire
- **WSL peut avoir des problèmes** de réseau - redémarrez si besoin
- **Les erreurs Telegram 400** sont souvent ignorables
