import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

declare global {
  interface Window {
    DD_RUM: IDDRum;
  }
}
import { Token } from '@lumino/coreutils';

export const IDDRum = new Token<IDDRum>('jupyterlab-datadog-rum:plugin:IDDRum');
export interface IDDRum {
  q: any[];
  onReady: (f: (c: any) => void) => void;
  init: (c: any) => void;
  setUser: (c: any) => void;
}

const plugin: JupyterFrontEndPlugin<IDDRum> = {
  id: 'jupyterlab-datadog-rum:plugin',
  autoStart: true,
  provides: IDDRum,
  requires: [ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry
  ): Promise<IDDRum> => {
    const setting = await settingRegistry.load(plugin.id);
    const clientToken = setting.get('clientToken').composite as string;
    const applicationId = setting.get('applicationId').composite as string;
    const env = setting.get('env').composite as string;
    const version = setting.get('version').composite as string;
    const service = setting.get('service').composite as string;
    const sessionSampleRate = setting.get('sessionSampleRate').composite as number;
    const sessionReplaySampleRate = setting.get('sessionReplaySampleRate').composite as number;
    const trackUserInteractions = setting.get('trackUserInteractions').composite as boolean;
    const trackResources = setting.get('trackResources').composite as boolean;
    const trackLongTasks = setting.get('trackLongTasks').composite as boolean;
    const defaultPrivacyLevel = setting.get('defaultPrivacyLevel').composite as string;
    const site = setting.get('site').composite as string;
    window.DD_RUM = {
      q: [],
      onReady: (c: any) => window.DD_RUM.q.push(c),
      init: (c: any) => {},
      setUser: (c: any) => {},
    };
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.datadoghq-browser-agent.com/us1/v5/datadog-rum.js';
    document.head.appendChild(script)
    window.DD_RUM.onReady(() => {
      window.DD_RUM.init({
        applicationId: applicationId,
        clientToken: clientToken,
        site: site,
        service: service,
        env: env || getMatch(/jupyterhub-([^.]+)/, window.location.hostname),
        version: version,
        sessionSampleRate: sessionSampleRate,
        sessionReplaySampleRate: sessionReplaySampleRate,
        trackUserInteractions: trackUserInteractions,
        trackResources: trackResources,
        trackLongTasks: trackLongTasks,
        defaultPrivacyLevel: defaultPrivacyLevel,
      });
      // On JupyterHub, the userId will appear in the URL path after /user/
      const userId = getMatch(/\/user\/([^\/]+)\//, window.location.pathname);
      if (userId) window.DD_RUM.setUser({ id: userId });
    });
    return window.DD_RUM;
  }
};

function getMatch(re: RegExp, s: string) {
  const match = s.match(re);
  return match ? match[1] : '';
}

export default plugin;
