# Discord DM Extractor

Scripts pour extraire et sauvegarder vos messages privés Discord en utilisant `discord.js-selfbot-v13`.

## ⚠️ Avertissement Important

**L'utilisation de selfbots peut violer les Conditions d'Utilisation de Discord.** Utilisez ces scripts à vos propres risques. Discord peut suspendre ou bannir votre compte si vous utilisez des selfbots.

## 📋 Prérequis

- Node.js (version 20.18+)
- Un token Discord (voir section "Obtenir votre token")

## 🚀 Installation

1. Clonez ou téléchargez les fichiers
2. Installez les dépendances :
```bash
npm install discord.js-selfbot-v13 debug
```

## 🔑 Obtenir votre token Discord

1. Ouvrez Discord dans votre navigateur
2. Appuyez sur `F12` pour ouvrir les outils de développement
3. Allez dans l'onglet `Console`
4. Tapez : `window.webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {for (const m of Object.keys(req.c).map((x) => req.c[x].exports).filter((x) => x)) {if (m.default && m.default.getToken !== undefined) {return copy(m.default.getToken())}if (m.getToken !== undefined) {return copy(m.getToken())}}}]); console.log('%cWorked!', 'font-size: 50px'); console.log(`%cYou now have your token in the clipboard!`, 'font-size: 16px')`
5. Appuyez sur Entrée
6. Votre token sera copié dans le presse-papiers

## 📖 Utilisation

### Script Basique

```bash
# Avec variable d'environnement
DISCORD_TOKEN=votre_token node dmExtractor.js

# Ou modifiez directement le script avec votre token
node dmExtractor.js
```

### Script Avancé avec Options

```bash
# Export basique
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js

# Avec options personnalisées
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --maxMessages 500 --format csv

# Filtrage par date (messages après le 1er janvier 2023)
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --date 2023-01-01

# Filtrage par utilisateur
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --user "nom_utilisateur"

# Sans attachments pour un fichier plus léger
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --noAttachments --noEmbeds
```

### Script Simple (Recommandé pour WSL)

```bash
# Script optimisé pour les problèmes de compatibilité
DISCORD_TOKEN=votre_token node dmExtractorSimple.js
```

## ⚙️ Options Avancées

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| `--maxMessages <number>` | Nombre maximum de messages par channel | 1000 |
| `--delay <ms>` | Délai entre les requêtes (évite rate limiting) | 1000ms |
| `--format <json\|csv>` | Format d'export | json |
| `--date <YYYY-MM-DD>` | Filtrer par date (messages après cette date) | Aucun filtre |
| `--user <username>` | Filtrer par nom d'utilisateur | Aucun filtre |
| `--noAttachments` | Exclure les attachments | Inclus |
| `--noEmbeds` | Exclure les embeds | Inclus |

## 📁 Structure des Données Exportées

### Format JSON

```json
{
  "channels": [
    {
      "id": "channel_id",
      "type": "DM",
      "name": "Nom du channel",
      "recipient": {
        "id": "user_id",
        "username": "username",
        "tag": "username#1234"
      },
      "messages": [
        {
          "id": "message_id",
          "content": "Contenu du message",
          "author": {
            "id": "author_id",
            "username": "author_name",
            "tag": "author#1234"
          },
          "timestamp": 1640995200000,
          "attachments": [...],
          "embeds": [...],
          "reactions": [...]
        }
      ]
    }
  ],
  "totalMessages": 1234,
  "exportDate": "2023-01-01T00:00:00.000Z",
  "stats": {
    "totalChannels": 10,
    "messagesByChannel": {...},
    "messagesByUser": {...}
  }
}
```

## 🔧 Fonctionnalités

### Script Basique (`dmExtractor.js`)
- ✅ Connexion automatique
- ✅ Récupération de tous les DMs
- ✅ Sauvegarde en JSON
- ✅ Statistiques de base
- ✅ Gestion des erreurs

### Script Avancé (`dmExtractorAdvanced.js`)
- ✅ Toutes les fonctionnalités du script basique
- ✅ Filtrage par date
- ✅ Filtrage par utilisateur
- ✅ Export CSV
- ✅ Options de configuration
- ✅ Statistiques détaillées
- ✅ Gestion des attachments/embeds
- ✅ Rate limiting intelligent

### Script Simple (`dmExtractorSimple.js`)
- ✅ Version optimisée pour WSL
- ✅ Meilleure gestion des erreurs
- ✅ Debug des types de channels
- ✅ Compatible avec Node.js v18+
- ✅ Gestion robuste des DMs

## 💡 Suggestions d'Amélioration

### Fonctionnalités Possibles
1. **Export HTML** : Créer une interface web pour naviguer dans les messages
2. **Recherche** : Indexer les messages pour une recherche rapide
3. **Backup incrémental** : Ne récupérer que les nouveaux messages
4. **Export par périodes** : Diviser l'export par mois/année
5. **Chiffrement** : Chiffrer les données sensibles
6. **Interface graphique** : Créer une app Electron
7. **Export multi-formats** : PDF, TXT, etc.
8. **Filtres avancés** : Par contenu, type de message, etc.
9. **Statistiques visuelles** : Graphiques avec Chart.js
10. **Synchronisation cloud** : Backup automatique

### Optimisations
1. **Cache intelligent** : Éviter de re-télécharger les mêmes messages
2. **Compression** : Compresser les fichiers d'export
3. **Streaming** : Traiter les gros volumes sans tout charger en mémoire
4. **Parallélisation** : Traiter plusieurs channels simultanément
5. **Base de données** : Utiliser SQLite pour de gros volumes

## 🛡️ Sécurité

- **Ne partagez jamais votre token Discord**
- **Utilisez des variables d'environnement** pour stocker les tokens
- **Supprimez les tokens** des logs et fichiers temporaires
- **Sauvegardez régulièrement** vos données importantes

## 📝 Exemples d'Utilisation

### Backup Complet
```bash
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --maxMessages 5000
```

### Export Léger (sans médias)
```bash
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --noAttachments --noEmbeds --maxMessages 1000
```

### Messages Récents (dernière année)
```bash
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --date 2023-01-01 --format csv
```

### Messages d'un Utilisateur Spécifique
```bash
DISCORD_TOKEN=votre_token node dmExtractorAdvanced.js --user "john_doe"
```

### WSL/Compatibilité
```bash
DISCORD_TOKEN=votre_token node dmExtractorSimple.js
```

## 🐛 Dépannage

### Erreur de Connexion
- Vérifiez que votre token est correct
- Assurez-vous que votre compte n'est pas suspendu
- Vérifiez votre connexion internet

### Rate Limiting
- Augmentez le délai avec `--delay 2000`
- Réduisez le nombre de messages avec `--maxMessages 500`

### Fichier Trop Gros
- Utilisez `--noAttachments --noEmbeds`
- Réduisez `--maxMessages`
- Filtrez par date avec `--date`

### Problèmes WSL/Node.js
- Utilisez `dmExtractorSimple.js` pour une meilleure compatibilité
- Vérifiez que vous utilisez Node.js v20.18+
- Installez la dépendance manquante : `npm install debug`

### Aucun DM Trouvé
- Vérifiez que vous avez des conversations DM actives
- Essayez le script simple qui a un meilleur debug
- Attendez que Discord charge complètement les données

## 📄 Licence

Ce projet est fourni à des fins éducatives uniquement. L'utilisation est à vos propres risques.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Ajouter de nouvelles fonctionnalités
- Améliorer la documentation
# vigilant-octo-dollop
