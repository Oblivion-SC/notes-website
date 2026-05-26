<?php
require_once 'db.php';
require_once 'auth_check.php';

$userId = getUserId($pdo);
if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    $stmt->execute([$userId]);
    $trash = $stmt->fetchAll();
    echo json_encode($trash);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>