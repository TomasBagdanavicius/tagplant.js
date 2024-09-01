<?php

declare(strict_types=1);

$uploads_dir = __DIR__ . DIRECTORY_SEPARATOR . "uploads";

foreach ($_FILES as $file) {
    $target_file = $uploads_dir . DIRECTORY_SEPARATOR . basename($file["name"]);
    move_uploaded_file($file["tmp_name"], $target_file);
}
