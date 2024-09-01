<?php

declare(strict_types=1);

file_put_contents("color-mode-store.txt", $_POST["value"]);
echo $_POST["value"];