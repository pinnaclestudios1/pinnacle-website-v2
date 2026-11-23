import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/main.css';

import content from './content.js';
import { UI } from './ui/UI.js';

const ui = new UI(content);

if (document.documentElement.classList.contains('gl')) {
  import('./App.js')
    .then(({ App }) => new App(content, ui).init())
    .catch((err) => {
      console.error(err);
      // Anything goes wrong with WebGL → fall back to the classic site.
      document.documentElement.classList.remove('gl');
    });
}
