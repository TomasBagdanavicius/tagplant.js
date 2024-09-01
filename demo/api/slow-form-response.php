<?php

declare(strict_types=1);

sleep(4);

$data = [
    'status' => 1,
    'message' => "Action has been taken",
];

header("Content-Type: application/json");
echo json_encode($data);