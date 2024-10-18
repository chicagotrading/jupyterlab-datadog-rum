import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

declare global {
  interface Window {
    DD_RUM: any;
  }
}
import { Token } from '@lumino/coreutils';

export const IGa = new Token<IGa>('jupyterlab-google-analytics:plugin:IGa');
export interface IGa {
  // gtag: (...args: any[]) => void;
  // config: (options: any) => void;
  DD_RUM: any;
}

/**
 * Initialization data for the jupyterlab-google-analytics extension.
 */
const plugin: JupyterFrontEndPlugin<IGa> = {
  id: 'jupyterlab-google-analytics:plugin',
  autoStart: true,
  provides: IGa,
  requires: [ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry
  ): Promise<IGa> => {
    //const setting = await settingRegistry.load(plugin.id);
    //const trackingId = setting.get('trackingId').composite as string;

    // Ref: https://app.datadoghq.com/rum/application/bd75ed12-cccf-46f1-a93f-a182bb14ed02/manage
    const DD_RUM: any = window.DD_RUM = {q: [], onReady: (c: any) => DD_RUM.q.push(c)};
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.datadoghq-browser-agent.com/us1/v5/datadog-rum.js';
    document.head.appendChild(script)
    DD_RUM.onReady(() => {
      const envMatch = window.location.hostname.match(/jupyterhub-([^.]+)/);
      const env = envMatch ? envMatch[1] : '';
      window.DD_RUM.init({
        // TODO: get these from settings rather than hard-coding:
        clientToken: 'pub847cde2d9fc7b37b711155e89ed591ed',
        applicationId: 'bd75ed12-cccf-46f1-a93f-a182bb14ed02',
        // `site` refers to the Datadog site parameter of your organization
        // see https://docs.datadoghq.com/getting_started/site/
        site: 'datadoghq.com',
        service: 'jupyterhub',
        env: env,
        // Specify a version number to identify the deployed version of your application in Datadog
        // version: '1.0.0',
        // TODO: expose the ctc-default-singleuser image version somewhere we can find it from here?
        sessionSampleRate: 100,
        sessionReplaySampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'allow',
      });
    });
    return {
      DD_RUM: DD_RUM,
    };

  }
};

export default plugin;
