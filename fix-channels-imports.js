const fs = require('fs');
let content = fs.readFileSync('/home/kistorix/Documents/projets/xonaris/plateforme2/frontend/src/pages/Channels.tsx', 'utf8');

// Replace all imports from lucide-react with the new list
content = content.replace(
  /import \{[^}]+\}\s+from\s+'lucide-react';/g,
  "import { Search, Tv, Play, Crown, Radio, X, MonitorPlay, AlertCircle, RefreshCw, Loader2, Globe, Film, Clapperboard, Dribbble, Newspaper, Compass, Baby, Music, Map as MapIcon, LayoutGrid, Laugh } from 'lucide-react';"
);

fs.writeFileSync('/home/kistorix/Documents/projets/xonaris/plateforme2/frontend/src/pages/Channels.tsx', content);
