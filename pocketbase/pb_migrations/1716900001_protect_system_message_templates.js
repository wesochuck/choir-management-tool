/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  templates.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin' && isSystemTemplate = false";
  app.save(templates);
}, (app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  templates.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  app.save(templates);
});
