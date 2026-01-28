import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const siteMenu = require('../siteMenu.json') as { [key: string]: any };

export default siteMenu;
