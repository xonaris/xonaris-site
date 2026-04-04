const fs = require('fs');
const path = '/home/kistorix/Documents/projets/xonaris/plateforme2/frontend/src/pages/Channels.tsx';
let content = fs.readFileSync(path, 'utf8');

const missingImports = "import { useEffect, useState, useRef, useCallback } from 'react';\n" +
                      "import { Link, useSearchParams } from 'react-router-dom';\n" +
                      "import { channelApi } from '../api';\n" +
                      "import type { Channel } from '../types';\n";

// Prepend missing imports if not already there
if (!content.includes('react-router-dom')) {
    content = missingImports + content;
}

fs.writeFileSync(path, content);
