import './court-enhancements.js';
import { injectStyles } from './styles.js';
import { mountEditor as editor } from './editor.js';
import { mountPlayer as player } from './viewer.js';
export function mountEditor(target){injectStyles();return editor(target);}
export function mountPlayer(target){injectStyles();return player(target);}
