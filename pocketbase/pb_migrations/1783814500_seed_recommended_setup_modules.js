/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const decodeValue = (value) => {
      if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
        try {
          value = String.fromCharCode(...value);
        } catch {
          return null;
        }
      }
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    let setupState;
    let moduleState;
    try {
      setupState = app.findFirstRecordByFilter('appSettings', "key = 'setup_state'");
      moduleState = app.findFirstRecordByFilter('appSettings', "key = 'module_state'");
    } catch {
      return;
    }

    const setupValue = decodeValue(setupState.get('value'));
    const moduleValue = decodeValue(moduleState.get('value'));
    const setupInitialized =
      setupValue && typeof setupValue === 'object' ? setupValue.initialized === true : false;
    const enabledModules =
      moduleValue && typeof moduleValue === 'object' && Array.isArray(moduleValue.enabled)
        ? moduleValue.enabled
        : [];

    if (!setupInitialized && enabledModules.length === 0) {
      moduleState.set('value', {
        version: 1,
        enabled: ['roster', 'events', 'musicLibrary', 'setLists'],
      });
      app.save(moduleState);
    }
  },
  () => {
    // The migration only seeds a default for unclaimed installs; no rollback is needed.
  }
);
