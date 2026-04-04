const fs = require('fs');
let content = fs.readFileSync('/home/kistorix/Documents/projets/xonaris/plateforme2/frontend/src/pages/Channels.tsx', 'utf-8');
content = content.replace(/import \{.*\} from 'lucide-react';/s, "import { Search, Tv, Play, Crown, Radio, X, MonitorPlay, AlertCircle, RefreshCw, Loader2, Globe, Film, Clapperboard, Dribbble, Newspaper, Compass, Baby, Music, Map as MapIcon, LayoutGrid, Laugh } from 'lucide-react';");
fs.writeFileSync('/home/kistorix/Documents/projets/xonaris/plateforme2/frontend/src/pages/Channels.tsx', content);
