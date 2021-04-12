module.exports = {
  /**
   * Name of the integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @required
   */
  name: 'IBM QRadar',
  /**
   * The acronym that appears in the notification window when information from this integration
   * is displayed.  Note that the acronym is included as part of each "tag" in the summary information
   * for the integration.  As a result, it is best to keep it to 4 or less characters.  The casing used
   * here will be carried forward into the notification window.
   *
   * @type String
   * @required
   */
  acronym: 'QR',
  onDemandOnly: true,
  defaultColor: 'light-gray',
  /**
   * Description for this integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @optional
   */
  description: 'IBM® QRadar® SIEM helps uncover security risks by analyzing and correlating log and networks events.',
  entityTypes: ['IPv4'],
  /**
   * An array of style files (css or less) that will be included for your integration. Any styles specified in
   * the below files can be used in your custom template.
   *
   * @type Array
   * @optional
   */
  styles: ['./styles/qradar.less'],
  /**
   * Provide custom component logic and template for rendering the integration details block.  If you do not
   * provide a custom template and/or component then the integration will display data as a table of key value
   * pairs.
   *
   * @type Object
   * @optional
   */
  block: {
    component: {
      file: './components/qradar-block.js'
    },
    template: {
      file: './templates/qradar-block.hbs'
    }
  },
  summary: {
    component: {
      file: './components/qradar-summary.js'
    },
    template: {
      file: './templates/qradar-summary.hbs'
    }
  },
  request: {
    // Provide the path to your certFile. Leave an empty string to ignore this option.
    // Relative paths are relative to the VT integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the VT integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the VT integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the VT integration's root directory
    ca: '',
    // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
    // the url parameter (by embedding the auth info in the uri)
    proxy: '',

    rejectUnauthorized: true
  },
  logging: {
    // directory is relative to the this integrations directory
    // e.g., if the integration is in /app/polarity-server/integrations/virustotal
    // and you set directoryPath to be `integration-logs` then your logs will go to
    // `/app/polarity-server/integrations/integration-logs`
    // You can also set an absolute path.  If you set an absolute path you must ensure that
    // the directory you specify is writable by the `polarityd:polarityd` user and group.

    //directoryPath: '/var/log/polarity-integrations',
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  /**
   * Options that are displayed to the user/admin in the Polarity integration user-interface.  Should be structured
   * as an array of option objects.
   *
   * @type Array
   * @optional
   */
  options: [
    {
      key: 'url',
      name: 'IBM QRadar Server URL',
      description:
        'The URL for your IBM QRadar server which should include the schema (i.e., http, https) and port if required',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'username',
      name: 'Username',
      description: 'The username of the IBM QRadar user you want the integration to authenticate as',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'password',
      name: 'password',
      description: 'The password for the provided username you want the integration to authenticate as',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'ignorePrivateIps',
      name: 'Ignore Private IPs',
      description:
        'If set to true, private IPs (RFC 1918 addresses) will not be looked up (includes 127.0.0.1, 0.0.0.0, and 255.255.255.255)',
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'minimumSeverity',
      name: 'Minimum Severity Level',
      description: 'The minimum severity level required for indicators to be displayed',
      default: 0,
      type: 'number',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'openOnly',
      name: 'Open Offenses Only',
      description: "If set to true, only offenses with a status value of 'OPEN' will be searched",
      default: true,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: true
    }
  ]
};
