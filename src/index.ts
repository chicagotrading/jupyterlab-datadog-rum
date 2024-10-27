import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    DD_RUM: IDDRum;
  }
}
import { Token } from '@lumino/coreutils';

export const PLUGIN_ID = 'jupyterlab-datadog-rum:plugin';
export const IDDRum = new Token<IDDRum>(`${PLUGIN_ID}:IDDRum`);
export interface IDDRum {
  q: any[];
  onReady: (f: (c: any) => void) => void;
  init: (c: any) => void;
  setUser: (c: any) => void;
}

// Ref: https://docs.datadoghq.com/real_user_monitoring/browser/
interface ISettings {
  applicationId: string;
  clientToken: string;
  env: string;
  version: string;
  service: string;
  sessionSampleRate: number;
  sessionReplaySampleRate: number;
  trackUserInteractions: boolean;
  trackResources: boolean;
  trackLongTasks: boolean;
  defaultPrivacyLevel: string;
  site: string;
}

const plugin: JupyterFrontEndPlugin<IDDRum> = {
  id: PLUGIN_ID,
  autoStart: true,
  provides: IDDRum,
  requires: [ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry
  ): Promise<IDDRum> => {
    console.debug(`${PLUGIN_ID}: activated`);
    window.DD_RUM = {
      q: [],
      onReady: (c: any) => window.DD_RUM.q.push(c),
      init: (c: any) => {},
      setUser: (c: any) => {}
    };
    const settings = (await settingRegistry.load(plugin.id)).composite
      .private as unknown as ISettings;
    if (!settings.applicationId || !settings.clientToken) {
      console.warn(`${PLUGIN_ID}: applicationId or clientToken not set`);
      return window.DD_RUM;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src =
      'https://www.datadoghq-browser-agent.com/us1/v5/datadog-rum.js';
    document.head.appendChild(script);
    window.DD_RUM.onReady(() => {
      window.DD_RUM.init({
        applicationId: settings.applicationId,
        clientToken: settings.clientToken,
        site: settings.site,
        service: settings.service,
        env:
          settings.env ||
          getMatch(/jupyterhub-([^.]+)/, window.location.hostname),
        version: settings.version,
        sessionSampleRate: settings.sessionSampleRate,
        sessionReplaySampleRate: settings.sessionReplaySampleRate,
        trackUserInteractions: settings.trackUserInteractions,
        trackResources: settings.trackResources,
        trackLongTasks: settings.trackLongTasks,
        defaultPrivacyLevel: settings.defaultPrivacyLevel
      });
      console.debug(`${PLUGIN_ID}: RUM initialized`);
      // On JupyterHub, the userId will appear in the URL path after /user/
      const userId = getMatch(/\/user\/([^/]+)\//, window.location.pathname);
      if (userId) {
        window.DD_RUM.setUser({ id: userId });
        console.debug(`${PLUGIN_ID}: detected user: ${userId}`);
      }
    });
    return window.DD_RUM;
  }
};

function getMatch(re: RegExp, s: string) {
  const match = s.match(re);
  return match ? match[1] : '';
}

export default plugin;
