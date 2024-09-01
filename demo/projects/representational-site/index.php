<?php

declare(strict_types=1);

$name = pathinfo($_GET["route"], PATHINFO_FILENAME);
$schema_filename = "schemas/" . $name . ".json";
if (!file_exists($schema_filename)) {
    header($_SERVER['SERVER_PROTOCOL'] . " 404 Not Found");
    exit;
}
$schema = file_get_contents($schema_filename);
if (isset($_GET['format']) && $_GET['format'] === "json") {
    header("Content-Type: application/json");
    die($schema);
}

?>
<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<title>Home</title>
<meta name="robots" content="noindex,nofollow">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=yes">
<link rel="stylesheet" href="../../stylesheets/demo-persistent.min.css" class="persistent">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<script type="module">

import { Site } from "../../../src/site/site.js";
import { Presentation } from "../../../src/site/presentation.js";
import { BackgroundProcessesTemplate } from "../../../src/site/templates/background-processes-template.js";
import { MainTemplate } from "./templates/main-template.js";

function startPresentation(template) {
    const presentation = new Presentation(document, template);
    presentation.start();
    Site.registerTemplateHashes(template);
}
const backgroundProcessesTemplate = new BackgroundProcessesTemplate({}, {
    includeNotifications: false,
    includeJobs: false,
});
startPresentation(backgroundProcessesTemplate);
Site.init({
    templateConstructor: MainTemplate,
    supportsAuthentication: false,
});

</script>
<script id="landing-data" type="application/json">
<?= $schema; ?>
</script>
</body>
</html>